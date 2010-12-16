/* javascript for the login page */
/* created because the inline javascript became too messy */
function browserSupportsInputPlaceholder() {
    var i = document.createElement('input');
    return 'placeholder' in i;
}

function submitOpenIDLoginForm(openIDURL) {
    // if an openIDURL was given, submit the form with that URL
    if (openIDURL) {
        $("#id_openid_identifier").val(openIDURL);
    }
    // submit the form
    $("#openid-login-form").submit();
}

function showMoreOpenIDOptions() {
    $("#openid-login-form").show();
    $("#more-openid-options").hide();
    // fade the user/pass login form out a bit to focus on openID
    $("#auth-login-form").fadeTo(0.5, 0.5);
}

function openIDProviderButton(providerName) {
    provider = providerName.toLowerCase();
    return $('<a href="#" class="openid-provider-button" provider="' + provider + '">\
        <img src="' + MEDIA_URL + 'img/accounts/openid/' + provider + '.png" /></a>');
}

function insertOpenIDProviderButtons() {
    for (var provider in openIDProviders) {
        $("#openid-provider-buttons").append(openIDProviderButton(provider));
    }
    $(".openid-provider-button").bind('click', function () {
        var provider = openIDProviders[$(this).attr('provider')];
        if (provider != undefined) {
            if (provider.url.indexOf("{username}") != -1) {
                var urlComponents = provider.url.split("{username}");
                $('#openid-username-provider-name').text(provider.name);
                $('#before-username-field').text(urlComponents[0]);
                $('#after-username-field').text(urlComponents[1]);
                $('#openid-provider-username-section').show();
                // fade the user/pass login form out a bit to focus on openID
                $("#auth-login-form").fadeTo(0.5, 0.5);
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
    insertOpenIDProviderButtons();

    // bind the openid provider username form events
    $("#openid-provider-username-submit").bind('click', function() {
        var openIDURL = $("#before-username-field").text()
        + $("#openid-provider-username").val()
        + $("#after-username-field").text();
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
    $("#openid-url-provider-button").bind('click', function () {
        $("#openid-login-form").show();
        $("#id_openid_identifier").focus();
        // fade the user/pass login form out a bit to focus on openID
        $("#auth-login-form").fadeTo(0.5, 0.5);
    });
});

