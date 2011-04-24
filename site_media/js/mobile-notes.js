var MainPage = Backbone.View.extend({
  tagName: 'span',
  events: {
    'click #beginSync': 'beginSync'
  },
  template: function () {
    return $('#template-main-page');
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');
  },

  render: function() {
    $(this.el).html(this.template().tmpl());
    return this;
  },

  beginSync: function() {
    console.log('sync');
    snowySyncController.syncNotesCollection(Notes);
  }
});

var NoteListPage = Backbone.View.extend({
  tagName: 'span',
  events: {
  },
  template: function () {
    return $('#template-note-list-page');
  },
  initialize: function() {
    // Bind render method to always be executed within the context of
    // this object
    _.bindAll(this, 'render');

  },

  render: function() {
    $(this.el).html(this.template().tmpl());
    var listNode = this.$('ul');
    // set up the items in the note list
    for (var i = 0; i < this.collection.models.length; i++) {
      var note = this.collection.at(i);
      var rowView = new NoteRowView({model: note});
      listNode.append(rowView.render().el);
    }
    return this;
  },

});

var NoteRowView = Backbone.View.extend({
  tagName: 'li',
  template: function() {
    return $('#template-note-row-view');
  },
  initialize: function() {
    //this.el = $('<li></li>');
    _.bindAll(this, 'render');
    this.model.bind('change', this.render);
  },

  render: function() {
    $(this.el).html(this.template().tmpl(this.model.attributes));
    return this;
  }
});


$(document).ready(function() {
  // fetch the notes from the local DB
  Notes.fetch()

  var mainPage = new MainPage();
  $('body').append(mainPage.render().el);

  var noteListPage = new NoteListPage({collection: Notes});
  $('body').append(noteListPage.render().el);
});

