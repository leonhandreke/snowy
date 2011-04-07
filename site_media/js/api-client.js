// A backbone.js based client to interact with the snowy REST API

/*var SnowyServer = function(baseURL) {
  this.baseURL = baseURL + '/api/1.0';
  // Request the user reference
  this.getUserRef();
  // Request the notes reference once we've got the user reference
  this.bind('gotUserRef', this.getNotesRef);
}

_.extend(SnowyServer.prototype, Backbone.Events, {
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
    var changes = model.toJSON();
    if (!(changes instanceof Array)) {
      changes = [changes];
    }
    var updateJSON = {
      "latest-sync-revision": (this['latest-sync-revision'] + 1),
      "note-changes": changes
    }
    // Set up so the request callbacks can access the server object
    var server = this;

    var params = {
      url: getUrl(model),
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(updateJSON),
      dataType: 'json',
      processData: false,
      success: function(response) {
        server['latest-sync-revision'] = response['latest-sync-revision'];
        // Fetch the collection because the compressed note listing is not of much use
        var collection = model.collection || model;
        collection.fetch();
        if (success) success(response);
      },
      error: error
    }
    $.ajax(params);
    // Provisionally up sync revision, it gets reread from the response anyway
    this['latest-sync-revision'] += 1;
  },
  create: function(model, success, error) {
    return this.update(model);
  },
  read: function(model, success, error) {
    var params = {
      url: getUrl(model),// + '?include_notes=true',
      success: success,
      error: error
    }
    $.ajax(params);
  }
});

/*
Backbone.sync = function(method, model, success, error) {
  var server = model.server || model.collection.server;
  // Let the server object handle all methods
  server[method](model, success, error);
};
*/


// Our Store is represented by a single JS object in *localStorage*. Create it
// with a meaningful name, like the name you'd give a table.
var Store = function(name) {
  this.name = name;
  var store = localStorage.getItem(this.name);
  this.data = (store && JSON.parse(store)) || {};
};

_.extend(Store.prototype, {

  // Save the current state of the **Store** to *localStorage*.
  save: function() {
    localStorage.setItem(this.name, JSON.stringify(this.data));
  },

  // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
  // have an id of it's own.
  create: function(model) {
    if (!model.id) model.id = model.attributes.id = guid();
    this.data[model.id] = model;
    this.save();
    return model;
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model) {
    this.data[model.id] = model;
    this.save();
    return model;
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

  var resp;
  var store = model.localStorage || model.collection.localStorage;

  switch (method) {
    case "read":    resp = model.id ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }

  if (resp && success) {
    success(resp);
  } else {
    if (error)
    error("Record not found");
  }
};

var Note = Backbone.Model.extend({
  // Initialize all attributes for a new note
  initialize: function() {
    if (!this.get("guid")) {
      // Generate a new UUID in case the note doesn't have on yet
      this.set({"guid": guid()});
    }
    else {
      // This model is not new because the guid is already known at creation
      // Set the guid as id to mark the model as available on the server
      this.id = this.get('guid');
    }
    /*if (!this.get("create-date")) {
      // Assume the note was created now
      this.set({"create-date": Date.now().toISOString()});
    }
    if (!this.get("last-change-date")) {
      this.set({"last-change-date": Date.now().toISOString()});
    }
    if (!this.get("last-metadata-change-date")) {
      this.set({"last-metadata-change-date": Date.now().toISOString()});
    }*/
    // Hacky-hacky solution to let the custom set use the original set
    this._set = this.set;
    this.set = this.noteSet
  },

  defaults: {
    'title': "New Note",
    'note-content': "Describe your new note here",
    'tags': [],
    'note-content-version': '0.1',
    'pinned': false,
    "last-change-date": "2009-04-19T21:29:23.2197340-07:00",
    "last-metadata-change-date": "2009-04-19T21:29:23.2197340-07:00",
    "create-date": "2008-03-06T13:44:46.4342680-08:00"
  },

  // Override set to update last-change-date and last-metadata-change-date
  noteSet : function(attrs, options) {
    // Let the prototype set the new attributes
    if(this._set(attrs, options)) {
      // If the content of the note was changed, update last-changed-date
      if (attrs["title"] || attrs["note-content"]) {
        this.set({"last-change-date": Date.now().toISOString() });
      }
      // If the metadata of the note was changed, update last-metadata-change-date
      if (attrs["tags"] || attrs["note-content-version"] || attrs["create-date"]
      || attrs["last-change-date"] || attrs["pinned"]) {
        this.set({"last-metadata-change-date": Date.now().toISOString()});
      }
      // _set was successful
      return true;
    } else {
      return false;
    }
  },

  parse: function(response) {
    // Check if a collection response was passed to us
    if (response['notes']) {
      // Pass on only the relevant objectr
      return (_.detect(response['notes'], function(note) {
        return(note['guid'] == this.get('guid'));
      }));
    }
    return response;
  },
  url: function() {
    // Notes do not have their own URL but are always part of a collection
    return getUrl(this.collection);
  }
});

var NotesCollection = Backbone.Collection.extend({
  model: Note,
  localStorage: new Store('notes'),
  parse: function(response) {
    // Pass on only the notes object if available
    return response['notes'] || response;
  },
  url: function() {
    return this.server['notes-ref'] + '?include_notes=true';
  }
});

var Notes = new NotesCollection();
//Notes.server = new SnowyServer(location.origin)

// Stolen from the backbone.js source
var getUrl = function(object) {
  if (!(object && object.url)) throw new Error("A 'url' property or function must be specified");
  return _.isFunction(object.url) ? object.url() : object.url;
};

// UUID generation code stolen from backbone-localstorage.js
// Generate four random hex digits.
function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

