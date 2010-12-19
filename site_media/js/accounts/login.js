/* javascript for the login page */
/* created because the inline javascript became too messy */
function submitOpenIDLoginForm(openIDURL) {
    // if an openIDURL was given, submit the form with that URL
    if (openIDURL) {
        $("#id_openid_identifier").val(openIDURL);
    }
    // submit the form
    $("#openid-login-form").submit();
}


function insertOpenIDProviderButtons() {
    var openIDProviderButton = function (providerName) {
        provider = providerName.toLowerCase();
        return $('<a href="#" class="openid-provider-button" provider="' + provider +
			'"><img src="' + MEDIA_URL + 'img/accounts/openid/' + provider + '.png" /></a>');
    };
    for (var mainProvider in mainOpenIDProviders) {
        $("#main-openid-provider-buttons").prepend(openIDProviderButton(mainProvider));
    }
    for (var extraProvider in extraOpenIDProviders) {
        $("#extra-openid-provider-buttons").prepend(openIDProviderButton(extraProvider));
    }
    $(".openid-provider-button").bind('click', function () {
        var openIDProviders = jQuery.extend(mainOpenIDProviders, extraOpenIDProviders);
        var provider = openIDProviders[$(this).attr('provider')];
        if (provider !== undefined) {
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

    // bind the log in button in the openID username input "form"
    $("#openid-provider-username-submit").bind('click', function() {
        var openIDURL = $("#before-username-field").text() +
			$("#openid-provider-username").val() +
			$("#after-username-field").text();
        submitOpenIDLoginForm(openIDURL);
    });

    // simulate a log in button press when pressing enter in the username field
    $("#openid-provider-username").bind('keypress', function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if(code == 13) { //Enter keycode
            // simulate a log in button press
            $("#openid-provider-username-submit").trigger('click');
        }
    });

    // bind the pure OpenID URL button
    $("#openid-url-provider-button").bind('click', function () {
        $("#openid-login-form").show();
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
});

