/* javascript for the login page */
/* created because the inline javascript became too messy */
function browserSupportsInputPlaceholder() {
    var i = document.createElement('input');
    return 'placeholder' in i;
}

function openIDProviderButtonClicked(providerName) {
    var provider = openIDProviders[providerName];
    if (provider.url.indexOf("{username}") != -1) {
        var urlComponents = provider.url.split("{username}")
            $('#openid-username-provider-name').text(provider.name);
        $('#before-username-field').text(urlComponents[0]);
        $('#after-username-field').text(urlComponents[1]);
        $('#openid-provider-username-section').show();
    }
    else {
        // this provider has one URL for all users
        submitOpenIDForm(provider.url);
    }
}

function submitOpenIDForm(openIDURL) {
    // if an openIDURL was given, submit the form with that URL
    console.log(openIDURL);
    if (openIDURL) {
        $("#id_openid_identifier").val(openIDURL);
    }
    // submit the form
    $("#openid-login-form").submit();
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
});

