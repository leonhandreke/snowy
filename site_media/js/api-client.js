// A backbone.js based client to interact with the snowy REST API

var Note = Backbone.Model.extend({
  // Initialize all attributes for a new note
  initialize: function() {
    if (!this.get("guid")) {
      // Generate a new UUID in case the note doesn't have on yet
      this.set({"guid": guid()});
    }
    if (!this.get("title")) {
      // Default the new note title to "New Note"
      this.set({"title": "New Note"});
    }
    if (!this.get("note-content")) {
      this.set({"note-content": "Describe your new note here"});
    }
    if (!this.get("tags")) {
      this.set({"tags": []});
    }
    if (!this.get("note-content-version")) {
      this.set({"note-content-version": 0.1});
    }
    if (!this.get("create-date")) {
      // Assume the note was created now
      this.set({"create-date": Date.now().toISOString()});
    }
    if (!this.get("last-change-date")) {
      this.set({"last-change-date": Date.now().toISOString()});
    }
    if (!this.get("last-metadata-change-date")) {
      this.set({"last-metadata-change-date": Date.now().toISOString()});
    }
    if (!this.get("pinned")) {
      // Set default pinned state to false
      this.set({"pinned": false});
    }
    this._set = this.set;
    this.set = this.noteSet
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
    }
  }
});

var Notes = new Backbone.Collection.extend({
  refresh: function(models, options) {
             this._reset();

           },
  model: Note
});

Backbone.sync = function(method, model, success, error) {};

var SnowyServer = function(baseURL) {
  this.baseURL = baseURL;
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
        server.userRef = response['user-ref']['api-ref'];
        server.trigger("gotUserRef", server.userRef);
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
      server.notesRef = response['notes-ref']['api-ref'];
      server.trigger("gotNotesRef", server.userRef);
      server.latestSyncRevision = response['latest-sync-revision'];
      server.user = {
        username: response['user-name'],
        firstName: response['first-name'],
        lastName: response['last-name']
      };
    };
    var params = {
      url: this.userRef,
      type: 'GET',
      success: gotNotesRef
    };
    $.ajax(params);
  },

  update: function(model) {
    var changes = [model.toJSON()];
    var updateMessage = {
      "latest-sync-revision": (this['latest-sync-revision'] + 1),
      "note-changes": changes
    }
    // TODO: actually make the request somewhere
  },
  create: function(model) {
    return update(model);
  },
  read: function(model) {
    var params = {
      url: notesRef
    }
  }

});



// UUID generation code stolen from backbone-localstorage.js
// Generate four random hex digits.
function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

