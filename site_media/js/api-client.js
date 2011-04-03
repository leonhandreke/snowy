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
                  this.set({"create-date": Date.today().toISOString()});
                }
                if (!this.get("last-change-date")) {
                  this.set({"last-change-date": Date.today().toISOString()});
                }
                if (!this.get("last-metadata-change-date")) {
                  this.set({"last-metadata-change-date": Date.today().toISOString()});
                }
                if (!this.get("pinned")) {
                  // Set default pinned state to false
                  this.set({"pinned": false});
                }
              },

  // Override set to update last-change-date and last-metadata-change-date
  set : function(attrs, options) {
          // Let the prototype set the new attributes
          if(this.prototype.set(attrs, options)) {
            // If the content of the note was changed, update last-changed-date
            if (attrs["title"] || attrs["note-content"]) {
              this.set({"last-change-date": Date.today().toISOString() });
            }
            // If the metadata of the note was changed, update last-metadata-change-date
            if (attrs["tags"] || attrs["note-content-version"] || attrs["create-date"]
                || attrs["last-change-date"] || attrs["pinned"]) {
              this.set({"last-metadata-change-date": Date.today().toISOString()});
            }
          }
        },
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

