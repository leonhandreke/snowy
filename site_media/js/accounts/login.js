/*
 * Copyright (c) 2011 Leon Handreke <leon.handreke@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* javascript for the login page */
/* created because the inline javascript became too messy */

// Submit an OpenID login URL in a way that the corresponding django view can understand
function submitOpenIDLoginForm(openIDURL) {
  // if an openIDURL was given, submit the form with that URL
  if (openIDURL) {
    $("#id_openid_identifier").val(openIDURL);
  }
  // submit the form
  $("#openid-login-form").submit();
}

// Responsible for generating and inserting the OpenID provider buttons
function insertOpenIDProviderButtons() {
  var openIDProviderButton = function (providerName) {
    provider = providerName.toLowerCase();
    // return a jQuery button element
    return $('<a href="#" class="openid-provider-button" provider="' + provider +
    '"><img src="' + MEDIA_URL + 'img/accounts/openid/' + provider + '.png" /></a>');
  };
  // generate the more important buttons */
  for (var mainProvider in mainOpenIDProviders) {
    $("#main-openid-provider-buttons").prepend(openIDProviderButton(mainProvider));
  }
  // generate the buttons hidden behind the "more..." link
  for (var extraProvider in extraOpenIDProviders) {
    $("#extra-openid-provider-buttons").prepend(openIDProviderButton(extraProvider));
  }
  // bind the generated buttons to their respective functions
  $(".openid-provider-button").bind('click', function () {
    var openIDProviders = jQuery.extend(mainOpenIDProviders, extraOpenIDProviders);
    var provider = openIDProviders[$(this).attr('provider')];
    // just to make sure, check the provider for the button is defined
    if (provider !== undefined) {
      // check if the provider has URLs that are user-specific
      if (provider.url.indexOf("{username}") != -1) {
        // split the url and put it before/after the username field
        var urlComponents = provider.url.split("{username}");
        $('#openid-username-provider-name').text(provider.name);
        $('#before-username-field').text(urlComponents[0]);
        $('#after-username-field').text(urlComponents[1]);
        // hide the OpenID URL form that may still be there
        $("#openid-login-form").hide();
        // clear the username field from whatever was there before
        $("#openid-provider-username").val('');
        // show the newly constructed pseudo-form
        $('#openid-provider-username-form').show();
        // focus on the new username entry field
        $("#openid-provider-username").focus();
      }
      else {
        // Hide the openID login form, otherwise the user would see
        // the provider URL appearing in there
        $("#openid-login-form").hide();
        // this provider has one URL for all users
        submitOpenIDLoginForm(provider.url);
      }
    }
  });
}

$(document).ready(function() {
  /* use CSS3 placeholder but make sure users with unsupported
   * browsers at least see the labels */
   var browserSupportsInputPlaceholder = function () {
     var i = document.createElement('input');
     return 'placeholder' in i;
   };
   // check if the browser supports HTML5 placeholder attributes for text fields
   if (browserSupportsInputPlaceholder()) {
     // loop over each label with jQuery
     $.each($("label"), function(i, element) {
       // extract the label valuefrom the label
       var for_input = $(element).attr('for');
       var text = $(element).text();
       // insert the placeholder into the corresponding input
       $("#" + for_input).attr('placeholder', text);
       // hide the label it's not needed anymore
       $(element).hide();
     });
   }

   // generate the provider buttons from the config file
   insertOpenIDProviderButtons();

   // make all OpenID provider buttons into jQuery buttons
   $(".openid-provider-button").button();
   // make all form submit buttons into jQuery buttons
   $("input:submit").button();
   // make all regular form buttons into jQuery buttons
   $("input:button").button();

   // bind the log in button in the openID username input "form"
   $("#openid-provider-username-submit").bind('click', function() {
     // assemble the user-specific OpenID URL for the provider
     var openIDURL = $("#before-username-field").text() +
     $("#openid-provider-username").val() + $("#after-username-field").text();
     submitOpenIDLoginForm(openIDURL);
   });

   // simulate a log in button press when pressing enter in the username field
   $("#openid-provider-username").bind('keypress', function(e) {
     var code = (e.keyCode ? e.keyCode : e.which);
     // check if the enter key was pressed
     if(code == 13) {
       // simulate a log in button press
       $("#openid-provider-username-submit").trigger('click');
     }
   });

   // bind the pure OpenID URL button
   $("#openid-url-provider-button").bind('click', function () {
     $("#openid-login-form").show();
     // clear the openID URL field
     $("#id_openid_identifier").val('');
     // focus on the new input field
     $("#id_openid_identifier").focus();
     /// hide the username entry form that may still be there
     $("#openid-provider-username-form").hide();
   });
   // bind the "more..." button
   $("#more-providers").bind('click', function () {
     $("#extra-openid-provider-buttons").show();
     // hide the "more" button
     $("#more-providers").hide();
     // hide the username entry form that may still be there
     $("#openid-provider-username-form").hide();
     // hide the OpenID URL form that may still be there
     $("#openid-login-form").hide();
   });

   // focus the username field when the page is loaded
   $("#id_username").focus()
 });

