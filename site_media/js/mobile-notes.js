var MainPage = Backbone.View.extend({
  events: {
    'click #beginSync': 'beginSync'
  },
  template: function () {
    return $('#template-main-page');
  },
  initialize: function() {
    // init own element
    this.el = $('<span></span>');
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    this.el.html(this.template().tmpl());
    return this;
  },

  beginSync: function() {
    console.log('sync');
    snowySyncController.syncNotesCollection(Notes);
  }
});

var NoteListPage = Backbone.View.extend({
  events: {
  },
  template: function () {
    return $('#template-note-list-page');
  },
  initialize: function() {
    // init own element
    this.el = $('<span></span>');
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    this.el.html(this.template().tmpl());
    return this;
  },

});

$(document).ready(function() {
  var mainPage = new MainPage();
  $('body').append(mainPage.render().el);

  var noteListPage = new NoteListPage({model: Notes});
  $('body').append(noteListPage.render().el);
});

