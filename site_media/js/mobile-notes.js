var AppController = Backbone.Controller.extend({
  routes: {
    '': 'showMainView',
    'note-list': 'showNoteListView'
  },

  showMainView: function() {
    var mainView = new MainView();
    this.showView(mainView);
    //var el = $(mainView.render().el);
    //$('body').append(el);
  },

  showNoteListView: function() {
    console.log('note-list');
    var noteListView = new NoteListView();
    this.showView(noteListView);
  },

  showView: function(view) {
    var el = $(view.render().el);
    // Append the view to the DOM
    $('body').append(el);
    // This weird method of transitioning the view is needed
    // else jQuery Mobile doesn't do the RightThing(tm)
    $.mobile.changePage($(el[0]));
  }
});

var MainView = Backbone.View.extend({
  events: {
    'click #beginSync': 'beginSync'
  },
  template: function () {
    return $('#template-main-view');
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    //$(this.el).html(this.template().tmpl());
    this.el = this.template().tmpl();
    return this;
  },

  beginSync: function() {
    console.log('sync');
    snowySyncController.syncNotesCollection(Notes);
  }
});

var NoteListView = Backbone.View.extend({
  events: {
  },
  template: function () {
    return $('#template-note-list-view');
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    this.el = this.template().tmpl();
    return this;
  },

});

$(document).ready(function() {
  // Disable jQuery Mobile link handling because AppControler does this
  $.mobile.hashListeningEnabled = false;
  $.mobile.ajaxEnabled = false;
  // Set up the AppController
  var appController = new AppController();
  Backbone.history.start()
});

