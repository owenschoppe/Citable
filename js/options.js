(function () {
    var bgPage = chrome.extension.getBackgroundPage();

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelector('#revoke').addEventListener('click', revokeToken);
        document.querySelector('#donate').addEventListener('click', donate);
        document.querySelector('#view_policy').addEventListener('click', policy);
        document.querySelector('#analytics').addEventListener('change', analytics);
        document.getElementById('configure').addEventListener('click', (e) => {
            chrome.tabs.create({
                url: "chrome://extensions/configureCommands"
            });
        });
        initUI();
        initCommands();
    });

    function revokeToken() {
        ga('send', 'event', 'Button', 'Revoke Token');

        chrome.identity.getAuthToken({
                'interactive': true
            },
            function (current_token) {
                if (!chrome.runtime.lastError) {
                    // Remove the local cached token
                    chrome.identity.removeCachedAuthToken({
                            token: current_token
                        },
                        function () {});

                    // Make a request to revoke token in the server
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                        current_token);


                    xhr.onload = function (e) {
                        console.log('onload', this, e.target);
                        this.lastResponse = this.response;
                    }.bind(this);

                    xhr.onerror = function (e) {
                        console.log(this, this.status, this.response);
                    };

                    xhr.send();

                    document.getElementById('revoke').disabled = true;
                    console.log('Token revoked and removed from cache. ' +
                        'Check chrome://identity-internals to confirm.');
                    initUI();
                }
            });
    }

    function donate(e) {
        ga('send', 'event', 'Button', 'Donate', 'Options');
    }

    function policy(e) {
        ga('send', 'event', 'Button', 'View Policy');
    }

    function initCommands() {
        chrome.commands.getAll((all) => {
            document.getElementById('browser_action').innerText = browserAction(all);
        });
    }

    function browserAction(all) {
        for (var i of all) {
            if (i.name == "_execute_browser_action") {
                return i.shortcut;
            }
        }
        return null;
    }

    function initAnalytics(response) {
        var input = document.querySelector("#analytics");
        input.checked = response.analytics == undefined ? true : response.analytics;
        input.disabled = false;
    }

    function analytics(e) {
        chrome.storage.sync.set({
            analytics: e.target.checked
        });
    }

    function initUI() {
        chrome.identity.getAuthToken({
            'interactive': false
        }, function (token) {
            // Use the token.
            if (!token) {
                //if (!bgPage.oauth.hasToken()) {
                document.getElementById('revoke').disabled = true;
            } else {
                console.log('Success!');
                access_token = token;
                document.getElementById('revoke').disabled = false;
            }
            if (chrome.runtime.lastError) {
                console.log('Oops', chrome.runtime.lastError);
            }

            chrome.storage.sync.get('analytics', initAnalytics);

        });
    }
})();