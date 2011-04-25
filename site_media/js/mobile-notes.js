var AppController = Backbone.Controller.extend({

  routes: {
    '': 'mainView',
    'note-list-view': 'noteListView'
  },

  mainView: function() {
    var mainView = new MainView();
    mainView.render();
    this.transitionToView(mainView);
  },

  noteListView: function() {
    var noteListView = new NoteListView({collection: Notes});
    noteListView.render();
    this.transitionToView(noteListView);
  },

  transitionToView: function(view) {
    // Append the view
    $('body').append(view.el);
    // do jQuery mobile page magic
    view.el.page();
    // Transistion to the new page
    // TODO: Some kind of history handling so the animation is reversed
    // when going back
    $.mobile.changePage(view.el);
    /*// Enable all the fancy jQuery mobile page transition stuff
    $.mobile.ajaxLinksEnabled = true;
    $.mobile.ajaxEnabled = true;
    $.mobile.hashListeningEnabled = true;
    // trigger a hashchange to transition to the new page
    $(window).trigger( "hashchange", [ true ] );
    // Disable the page transitions again so we can do our
    // own has change handling
    $.mobile.ajaxLinksEnabled = false;
    $.mobile.ajaxEnabled = false;
    $.mobile.hashListeningEnabled = false;*/
  }
});

// Extend Backbone.View with some useful utilities
var mobileNotesViewUtils = {
  updateElement: function(newElement) {
    // Check if we already have an Element
    if ($(this.el).html()) {
      // Only replace the HTML content
      $(this.el).html($(newElement).html());
    } else {
      // This is a totally new element
      this.el = $(newElement);
    }
  }
}
_.extend(Backbone.View.prototype, mobileNotesViewUtils);

var MainView = Backbone.View.extend({
  events: {
    'click #beginSync': 'beginSync'
  },
  template: function () {
    return mainViewTemplate;
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    this.updateElement($.tmpl(this.template()));
    return this;
  },

  beginSync: function() {
    console.log('sync');
    snowySyncController.syncNotesCollection(Notes);
  }
});

var NoteListView = Backbone.View.extend({
  template: function () {
    return noteListViewTemplate;
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');

    // Rebuild the whole list if something changes
    this.collection.bind('change', this.render);
  },

  render: function() {
    var newElement = $.tmpl(noteListViewTemplate, {
      notes: this.collection.models
    });
    this.updateElement(newElement);
  },

});

$(document).ready(function() {
  // Disable all jQuery mobile magic that breaks Backbone Controllers
  $.mobile.ajaxLinksEnabled = false;
  $.mobile.ajaxEnabled = false;
  $.mobile.hashListeningEnabled = false;
  // instantiate our own controller
  var appController = new AppController()
  // enable Backbone hashchange listening
  Backbone.history.start();
  // fetch the notes from the local DB
  Notes.fetch();
});

