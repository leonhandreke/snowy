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

from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse
from django.conf import settings
from urlparse import urlunparse

def reverse_full(name, args=(), kwargs={}):
    site = Site.objects.get_current()
    return urlunparse([
        settings.URI_SCHEME, site.domain, 
        reverse(name, args=args, kwargs=kwargs), '', '', ''
    ])
