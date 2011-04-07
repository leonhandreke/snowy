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

from django.utils.translation import ugettext_lazy as _

from django.contrib.auth import get_backends
from django.contrib.auth.forms import AuthenticationForm, UserChangeForm, PasswordChangeForm
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, REDIRECT_FIELD_NAME
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt

from django.shortcuts import render_to_response
from django.http import HttpResponseRedirect, HttpResponseNotAllowed
from django.template import RequestContext
from django.conf import settings

from snowy.accounts.models import UserProfile
from snowy.accounts.forms import InternationalizationForm, OpenIDRegistrationFormUniqueUser, EmailChangeForm, RemoveUserOpenIDForm

from django_openid_auth import auth
from django_openid_auth.auth import OpenIDBackend
from django_openid_auth.models import UserOpenID
from django_openid_auth.forms import OpenIDLoginForm

import django_openid_auth.views
import django.contrib.auth.views

def openid_registration(request, template_name='registration/registration_form.html'):
    registration_form = OpenIDRegistrationFormUniqueUser(request.POST or None)

    try:
        openid_response = request.session['openid_response']
    except KeyError:
        return HttpResponseNotAllowed(_(u'No openid_response object for this session!'))

    # If the user is already logged on, then link this new UserOpenID to their User
    if request.user.is_authenticated():
        for backend in get_backends():
            if type(backend) == OpenIDBackend:
                backend.associate_openid(request.user, openid_response)

        # Clear the openid_response from the session so it can't be used to create another account
        del request.session['openid_response']

        return HttpResponseRedirect(reverse('preferences'))

    try:
        attributes = auth._extract_user_details(openid_response)
        registration_form.fields['username'].initial = attributes['nickname']
        registration_form.fields['email'].initial = attributes['email']
    except KeyError:
        pass

    if registration_form.is_valid():
        user = authenticate(openid_response=openid_response,
                            username=registration_form.cleaned_data.get('username', ''),
                            create_user=True)
        # Clear the openid_response from the session so it can't be used to create another account
        del request.session['openid_response']

        if user is not None:
            email = registration_form.cleaned_data.get('email')
            if email:
                user.email = email
            if getattr(settings, 'MODERATE_NEW_USERS', False):
                user.is_active = False

            user.save()
            user.get_profile().save()
            if user.is_active:
                login(request, user)
                return HttpResponseRedirect(settings.LOGIN_REDIRECT_URL)
            else:
                if not getattr(settings, 'MODERATE_NEW_USERS', False):
                    return HttpResponseNotAllowed(_(u'Disabled account'))
                else:
                    return render_to_response("registration/moderated.html", {'user': user,},
                                              context_instance=RequestContext(request))
        else:
            return HttpResponseNotAllowed(_(u'Unknown user'))

    return render_to_response(template_name,
                              {'form' : registration_form},
                              context_instance=RequestContext(request))

def openid_begin(request, **kwargs):
    """A wrapper view around the login_begin view in
    django_openid_auth that features a nicer error display"""
    redirect_to = request.REQUEST.get(REDIRECT_FIELD_NAME, '')
    if redirect_to != '':
        request.session['login_complete_redirect'] = redirect_to

    return django_openid_auth.views.login_begin(request, render_failure=render_openid_failure,
                                                   **kwargs)

@csrf_exempt
def openid_complete(request, **kwargs):
    """A wrapper view around the login_complete view in
    django_openid_auth that features a nicer error page"""
    return django_openid_auth.views.login_complete(request, render_failure=render_openid_failure,
                                                   **kwargs)

def render_openid_failure(request, message, status=403, **kwargs):
    """A wrapper view around the login page to display an error message above
    the login form"""
    # the most common error is a mistyped URL - make the error message less cryptic for this case
    # TODO: Put this "error message correction" in a better place - maybe django_openid_auth
    error_message = unicode(message)
    if error_message.find("OpenID discovery error: Error fetching XRDS document:") > -1:
        error_message = unicode(_("OpenID endpoint not found. Please check your OpenID."))

    messages.add_message(request, messages.ERROR, _("Error logging in: ") + error_message)
    return HttpResponseRedirect(reverse('auth_login'))

def accounts_login(request, template_name='accounts/login.html', *args, **kwargs):
    # create both the OpenID and django.contrib.auth login form
    openid_form = OpenIDLoginForm()
    # change the label text to something nicer
    openid_form.fields['openid_identifier'].label = _("OpenID")
    if request.method == "POST":
        auth_form = AuthenticationForm(data=request.POST)
        # If is_valid() returns true we can be 99% certain there won't be an error when loggging in
        if auth_form.is_valid():
            # Pass control to django_auth and return the result
            return django.contrib.auth.views.login(request, auth_form.get_user())
    else:
        auth_form = AuthenticationForm()

    return render_to_response(template_name, {
        'auth_form': auth_form,
        'openid_form': openid_form },
        context_instance=RequestContext(request))

@login_required
def accounts_preferences(request, template_name='accounts/preferences.html'):
    user = request.user
    profile = user.get_profile()
    open_ids = UserOpenID.objects.filter(user=user)

    if 'password_form' in request.POST:
        password_form = PasswordChangeForm(user, data=request.POST)
        if password_form.is_valid():
            password_form.save()
            messages.add_message(request, messages.SUCCESS, _("Password changed"))
    else:
        password_form = PasswordChangeForm(user)

    if 'email_form' in request.POST:
        email_form = EmailChangeForm(request.POST, instance=user)
        if email_form.is_valid():
            email_form.save()
    else:
        email_form = EmailChangeForm(instance=user)

    if 'i18n_form' in request.POST:
        i18n_form = InternationalizationForm(request.POST, instance=profile)
        if i18n_form.is_valid():
            i18n_form.save()
    else:
        i18n_form = InternationalizationForm(instance=profile)

    if 'openid_form' in request.POST:
        openid_form = RemoveUserOpenIDForm(request.POST, open_ids=open_ids)
        if openid_form.is_valid():
            if len(open_ids) == 1 and not user.has_usable_password():
                openid_form.errors['openid'] = [_('Cannot delete the last OpenID account')]
            else:
                openid_form.cleaned_data['openid'].delete()
    else:
        openid_form = RemoveUserOpenIDForm(open_ids=open_ids)

    return render_to_response(template_name,
                              {'user': user, 'i18n_form': i18n_form,
                               'password_form': password_form,
                               'email_form' : email_form,
                               'open_ids' : open_ids,
                               'openid_form' : openid_form},
                              context_instance=RequestContext(request))
