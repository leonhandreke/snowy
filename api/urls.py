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

from django.conf.urls.defaults import *

from piston.authentication import OAuthAuthentication, SessionAuthentication
from piston.resource import Resource

from snowy.api.handlers import *

oauth_auth = { 'authentication': OAuthAuthentication(realm='Snowy') }
session_auth = { 'authentication': SessionAuthentication() }

""" piston resources are marked csrf_exempt to ensure the the django
CsrfMiddleware doesn't interfere with POST requests
http://bitbucket.org/jespern/django-piston/issue/82/post-requests-fail-when-using-django-trunk """

root_resource_oauth = Resource(handler=RootHandler, **oauth_auth)
user_resource_oauth = Resource(handler=UserHandler, **oauth_auth)
notes_resource_oauth = Resource(handler=NotesHandler, **oauth_auth)
note_resource_oauth = Resource(handler=NoteHandler, **oauth_auth)

root_resource_session = Resource(handler=RootHandler, **session_auth)
user_resource_session = Resource(handler=UserHandler, **session_auth)
notes_resource_session = Resource(handler=NotesHandler, **session_auth)
note_resource_session = Resource(handler=NoteHandler, **session_auth)

resources = [root_resource_oauth, user_resource_oauth, notes_resource_oauth,
             note_resource_oauth, root_resource_session, user_resource_session, notes_resource_session, note_resource_session]

for resource in resources:
    resource.csrf_exempt = True

urlpatterns = patterns('',
    # these patterns have to come first because the 'more general' oauth patterns match them as well
    url(r'1.0/(?P<username>\w+)/notes/(?P<note_id>\d+)/session_auth/$', note_resource_session),
    url(r'1.0/(?P<username>\w+)/notes/session_auth/$', notes_resource_session),
    url(r'1.0/(?P<username>\w+)/session_auth/$', user_resource_session),
    url(r'1.0/session_auth/$', root_resource_session),
    # 1.0 API methods
    url(r'1.0/(?P<username>\w+)/notes/(?P<note_id>\d+)/$', note_resource_oauth, name='note_api_detail'),
    url(r'1.0/(?P<username>\w+)/notes/$', notes_resource_oauth, name='note_api_index'),
    url(r'1.0/(?P<username>\w+)/$', user_resource_oauth, name='user_api_index'),
    url(r'1.0/$', root_resource_oauth),
)
