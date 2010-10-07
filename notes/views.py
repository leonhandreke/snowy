#
# Copyright (c) 2009 Brad Taylor <brad@getcoded.net>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option) any
# later version.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

from django.http import HttpResponseRedirect, HttpResponseForbidden, Http404
from django.shortcuts import render_to_response, get_object_or_404
from django.core.exceptions import ObjectDoesNotExist
from django.core.urlresolvers import reverse
from django.core.paginator import Paginator
from django.contrib.auth.models import User
from django.template import RequestContext
from django.db.models import Q

from datetime import datetime

from snowy.notes.templates import CONTENT_TEMPLATES, DEFAULT_CONTENT_TEMPLATE
from snowy.notes.models import *
from snowy import settings

def note_index(request, username,
               template_name='notes/note_index.html'):
    author = get_object_or_404(User, username=username)
    enabled = author.is_active

    # TODO: retrieve the last open note from the user
    last_modified = Note.objects.user_viewable(request.user, author) \
                                .order_by('-user_modified')
    if last_modified.count() > 0:
        return HttpResponseRedirect(last_modified[0].get_absolute_url())

    # TODO: Instruction page to tell user to either sync or create a new note
    return render_to_response(template_name,
                              {'author': author,
                               'enabled': enabled,
                               # Django 1.1 does not support == operator, so
                               # we need to do the check here and pass it along
                               'author_is_user': username==request.user.username},
                              context_instance=RequestContext(request))

def note_list(request, username,
              template_name='notes/note_list.html'):
    author = get_object_or_404(User, username=username)
    notes = Note.objects.user_viewable(request.user, author)
    return render_to_response(template_name,
                              {'notes': notes},
                              context_instance=RequestContext(request))

def note_detail(request, username, note_id, slug='',
                template_name='notes/note_detail.html'):
    author = get_object_or_404(User, username=username)
    note = get_object_or_404(Note, pk=note_id, author=author)

    if request.user != author and note.permissions == 0:
        return HttpResponseForbidden()

    # check if the user wants to save a note
    if request.method == "POST":
        markdown_string = request.POST['editor']
        from tomboy_markdown import tomboy_markdown
        tomboy_string = tomboy_markdown.markdown_to_tomboy(markdown_string)
        # only save if the note was updated
        if tomboy_string and tomboy_string != note.content:
            # save note and update profile
            profile = author.get_profile()
            new_sync_rev = profile.latest_sync_rev + 1
            note.content = tomboy_string
            # update modified timestamps
            note.modified = datetime.utcnow()
            note.user_modified = datetime.utcnow()
            # set new sync revisions so other clients know there were changes
            note.last_sync_rev = new_sync_rev
            note.save()
            profile.latest_sync_rev = new_sync_rev
            profile.save()

    if note.slug != slug:
        return HttpResponseRedirect(note.get_absolute_url())

    # break this out into a function
    from lxml import etree
    import os.path

    # Extension function for XSL. Called twice per link,
    # so we keep a little cache to save on lookups
    link_cache = {}
    def get_url_for_title(dummy, link_text):
        if link_text in link_cache:
            return link_cache[link_text]
        try:
            note = Note.objects.get(author=author, title=link_text)
            note_url = note.get_absolute_url()
            link_cache[link_text] = note_url
            return note_url
        except ObjectDoesNotExist:
            return None

    ns = etree.FunctionNamespace("http://tomboy-online.org/stuff")
    ns.prefix = "tomboyonline"
    ns['get_url_for_title'] = get_url_for_title

    style = etree.parse(os.path.join(settings.PROJECT_ROOT,
                                     'data/note2xhtml.xsl'))
    transform = etree.XSLT(style)

    template = CONTENT_TEMPLATES.get(note.content_version, DEFAULT_CONTENT_TEMPLATE)
    complete_xml = template.replace('%%%CONTENT%%%', note.content)
    doc = etree.fromstring(complete_xml)

    result = transform(doc)
    body = str(result)

    # generate the markdown version for editing
    from tomboy_markdown import tomboy_markdown
    markdown_body = tomboy_markdown.tomboy_to_markdown(note.content)
    
    return render_to_response(template_name,
                              {'title': note.title,
                               'note': note, 'body': body,
                               'markdown_body': markdown_body,
                               'request': request, 'author': author},
                              context_instance=RequestContext(request))
