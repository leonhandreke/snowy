// A backbone.js based client to interact with the snowy REST API

var SnowyServer = function(baseURL) {
  this.baseURL = baseURL + '/api/1.0';
  // Request the user reference
  this.getUserRef();
  // Request the notes reference once we've got the user reference
  this.bind('gotUserRef', this.getNotesRef);
}

_.extend(SnowyServer.prototype, Backbone.Events, {
  // queue for operations so only one request is made at a time
  queuedNoteChanges: [],
  pushQueuedNoteChanges: function(success, error) {
    // Don't push anything if there are no changes to push
    if (this.queuedNoteChanges.length < 1) return;
    var updateJSON = {
      "latest-sync-revision": (this['latest-sync-revision'] + 1),
      "note-changes": this.queuedNoteChanges
    }
    // Set up so the request callbacks can access the server object
    var server = this;
    // Remember which changes were submitted so we can retry
    var submittedNoteChanges = this.queuedNoteChanges;
    // Empty queue of note changes
    this.queuedNoteChanges = [];

    var params = {
      url: server['notes-ref'],
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updateJSON),
      dataType: 'json',
      processData: false,
      success: function(response) {
        server['latest-sync-revision'] = response['latest-sync-revision'];
        if (success) success(response);
      },
      error: function(response) {
        // TODO: Maybe retry immediately? (Retransmission will happen
        // on the next sync anyway)
        // or split the note changes up and submit each change
        // individually
        if (error) error();
      }
    }
    $.ajax(params);
  },

  // Request the user reference for the currently logged-in user
  getUserRef: function() {
    var server = this;
    // Callback upon successful completion of the request
    var gotUserRef = function(response) {
      // Check if the reponse contains the required fields
      if(response && response['user-ref'] && response['user-ref']['api-ref']) {
        server['user-ref'] = response['user-ref']['api-ref'];
        server.trigger("gotUserRef", server['user-ref']);
      }
      else {
        // If nobody is logged in, there is no user-ref field in the reply
        // TODO: Real error handling with user feedback
        console.log("Not logged in");
      }
    };
    // Construct the parameters for the request
    var params = {
      url: this.baseURL,
      type: 'GET',
      success: gotUserRef
    };
    $.ajax(params);
  },
  // Request the notes reference for the currently logged-in user
  getNotesRef: function() {
    var server = this;
    // Callback upon successful completion of the request
    var gotNotesRef = function(response) {
      // TODO: Maybe some error handling here? Who knows what could go wrong...
      server['latest-sync-revision'] = response['latest-sync-revision'];
      server['notes-ref'] = response['notes-ref']['api-ref'];
      server.trigger("gotNotesRef", server['notes-ref']);
      server.user = {
        username: response['user-name'],
        firstName: response['first-name'],
        lastName: response['last-name']
      };
    };
    var params = {
      url: this['user-ref'],
      type: 'GET',
      success: gotNotesRef
    };
    $.ajax(params);
  },

  update: function(model, success, error) {
    // queue the model to be sent to the server
    this.queuedNoteChanges.push(model.toJSON());
  },
  create: function(model, success, error) {
    return this.update(model);
  },
  destroy: function(model, success, error) {
    this.queuedNoteChanges.push({
      'guid': model.get('guid'),
      'command': 'delete'
    });
  },
  readAll: function(model, success, error) {
    var server = this;
    var params = {
      url: server['notes-ref'] + '?include_notes=true',
      success: function(response) {
        server['latest-sync-revision'] = response['latest-sync-revision'];
        if (success) success(response['notes']);
      },
      error: error
    }
    $.ajax(params);
  }
});

// This functionality has its own object because it may be extended to
// support more advanced features like intelligent merging in the future
var snowySyncController = {
  // Sync a collection of type NotesCollection
  syncNotesCollection: function(collection) {
    // Set this variable so anonymous function can access this
    var controller = this;
    // Set up local and server storage variables for easy access
    var snowyServer = collection.snowyServer;
    var localStorage = collection.localStorage;
    // Fetch the latest revision from the server
    snowyServer.readAll(collection, function(serverNotes) {
      if (snowyServer['latest-sync-revision'] > localStorage.syncRevision) {
        // The revision on the server is newer
        // TODO: Some intelligent merging of local changes with new revision
        // Refresh the notes from server notes
        localStorage.updateAll(collection);
        // Fetch the working copy of the collection from localStorage
        collection.fetch();
        // Update the local sync revision after successful push
        localStorage.syncRevision = snowyServer['latest-sync-revision'];
        localStorage.save();
      } else {
        // We locally have the newest version of the notes
        // Loop through the server notes to see which notes have
        // have changed or have been deleted locally
        _.each(serverNotes, function(serverResponseNote) {
          var serverNote = new Note(serverResponseNote);
          var localNote = new Note(localStorage.find(serverNote));
          // Check if this note on the server still exists locally
          if (localNote) {
            // Check if the note has changed
            if (!serverNote.equals(localNote)) {
              // Note was updated locally, update with local content
              snowyServer.update(localNote);
            }
          } else {
            // This note was deleted locally
            snowyServer.destroy(serverNote);
          }
        });
        // Loop through the local notes to see which notes have been
        // added locally
        _.each(localStorage.findAll(), function(storageResponseNote) {
          // Check if the local note exists in the server note set
          if (!_.detect(serverNotes, function(serverResponseNote) {
            return serverResponseNote['guid'] == storageResponseNote['guid'];
          })) {
            // This is a note that has been created locally
            // create it on the server too
            snowyServer.create(new Note(storageResponseNote));
          }
        });
        // Push any changes that may have been detected
        snowyServer.pushQueuedNoteChanges(function() {
          // Update the local sync revision after successful push
          localStorage.syncRevision = snowyServer['latest-sync-revision'];
          localStorage.save();
        });
      }
    });
  }
};

// Our Store is represented by a single JS object in *localStorage*. Create it
// with a meaningful name, like the name you'd give a table.
var Store = function(name) {
  this.name = name;
  var store = localStorage.getItem(this.name);
  this.data = (store && JSON.parse(store)) || {};
  this.syncRevision = localStorage.getItem(this.name + 'syncRevision') || 0;
};

_.extend(Store.prototype, {

  // Save the current state of the **Store** to *localStorage*.
  save: function() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
    localStorage.setItem(this.name + 'syncRevision', this.syncRevision);
  },

  // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
  // have an id of it's own.
  create: function(model) {
    if (!model.id) model.id = model.attributes.id = guid();
    // save JSON representation to make sure localStorage only contains JSON
    this.data[model.id] = model.toJSON();
    this.save();
    return model;
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model) {
    // save JSON representation to make sure localStorage only contains JSON
    this.data[model.id] = model.toJSON();
    this.save();
    return model;
  },

  updateAll: function(collection) {
    _.each(collection.models, function(model) {
      collection.localStorage.update(model)
    });
  },

  // Retrieve a model from `this.data` by id.
  find: function(model) {
    return this.data[model.id];
  },

  // Return the array of all models currently in storage.
  findAll: function() {
    return _.values(this.data);
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model) {
    delete this.data[model.id];
    this.save();
    return model;
  }

});

// Override `Backbone.sync` to use delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
Backbone.sync = function(method, model, success, error) {
  var storageResponse;
  var store = model.localStorage || model.collection.localStorage;

  switch (method) {
    case "read": storageResponse = model.id ? store.find(model) : store.findAll(); break;
    case "create": storageResponse = store.create(model); break;
    case "update": storageResponse = store.update(model); break;
    case "delete": storageResponse = store.destroy(model); break;
  }

  if (storageResponse) {
    if (success) {
      success(storageResponse);
    }
  } else {
    if (error) {
      error("Record not found");
    }
  }
};

var Note = Backbone.Model.extend({
  // Initialize all attributes for a new note
  initialize: function() {
    if (!this.get("guid")) {
      // Generate a new UUID in case the note doesn't have on yet
      this.set({"guid": guid()});
    }
    // Make the guid the model ID
    this.id = this.get('guid');

    if (!this.get("create-date")) {
      // Assume the note was created now
      this.set({"create-date": (new Date()).toISOString()});
    }

    if (!this.get("last-change-date")) {
      this.set({"last-change-date": (new Date()).toISOString()});
    }

    if (!this.get("last-metadata-change-date")) {
      this.set({"last-metadata-change-date": (new Date()).toISOString()});
    }
    if (!this.get('last-metadata-change-date') instanceof Date) {
      this.set({'last-metadata-change-date': Date.parse(this.get('last-metadata-change-date'))});
    }

    // Hacky-hacky solution to let the custom set use the original set
    this._set = this.set;
    this.set = this.noteSet
  },

  // Compare two note objects and return true if they're equal
  equals: function(otherNote) {
    return (_.isEqual(this.get('guid'), otherNote.get('guid'))
    && _.isEqual(this.get('title'), otherNote.get('title'))
    && _.isEqual(this.get('note-content'), otherNote.get('note-content'))
    && _.isEqual(this.get('pinned'), otherNote.get('pinned'))
    && _.isEqual(this.get('note-content-version'), otherNote.get('note-content-version'))
    && _.isEqual(this.get('tags'), otherNote.get('tags'))
    && _.isEqual((new Date(this.get('create-date'))).getTime(), (new Date(this.get('create-date'))).getTime())
    && _.isEqual((new Date(this.get('last-change-date'))).getTime(), (new Date(this.get('last-change-date'))).getTime())
    && _.isEqual((new Date(this.get('last-metadata-change-date'))).getTime(), (new Date(this.get('last-metadata-change-date'))).getTime()))
  },

  defaults: {
    'title': "New Note",
    'note-content': "Describe your new note here",
    'tags': [],
    'note-content-version': '0.1',
    'pinned': false,
  },

  // Override set to update last-change-date and last-metadata-change-date
  noteSet : function(attrs, options) {
    // Let the prototype set the new attributes
    if(this._set(attrs, options)) {
      // If the content of the note was changed, update last-changed-date
      if (attrs["title"] || attrs["note-content"]) {
        this.set({"last-change-date": (new Date).toISOString() });
      }
      // If the metadata of the note was changed, update last-metadata-change-date
      if (attrs["tags"] || attrs["note-content-version"] || attrs["create-date"]
      || attrs["last-change-date"] || attrs["pinned"]) {
        this.set({"last-metadata-change-date": (new Date).toISOString()});
      }
      // _set was successful
      return true;
    } else {
      return false;
    }
  }
});

var NotesCollection = Backbone.Collection.extend({
  model: Note
});

// Set up notes collection used by the application
var Notes = new NotesCollection();
Notes.localStorage = new Store('notes');
Notes.snowyServer = new SnowyServer('http://' + location.host);

// UUID generation code stolen from backbone-localstorage.js
// Generate four random hex digits.
function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

