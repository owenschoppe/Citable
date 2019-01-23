var bgPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function() {
  _gaq.push(['_trackEvent', 'Button', 'Revoke Token']);
  document.querySelector('#revoke').addEventListener('click', revokeToken);
});

function revokeToken() {
  //user_info_div.innerHTML="";
  chrome.identity.getAuthToken({
      'interactive': true
    },
    function(current_token) {
      if (!chrome.runtime.lastError) {

        // @corecode_begin removeAndRevokeAuthToken
        // @corecode_begin removeCachedAuthToken
        // Remove the local cached token
        chrome.identity.removeCachedAuthToken({
            token: current_token
          },
          function() {});
        // @corecode_end removeCachedAuthToken

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
        // @corecode_end removeAndRevokeAuthToken

        // Update the user interface accordingly
        //changeState(STATE_START);
        document.getElementById('revoke').disabled = true;
        console.log('Token revoked and removed from cache. ' +
          'Check chrome://identity-internals to confirm.');
        initUI();
      }
    });
}

function initCommands() {
    chrome.commands.getAll((all) => { 
        console.log(all);
        document.getElementById('browser_action').innerText = browserAction(all);
    });
}

function browserAction(all) {
    for(var i of all){
        if (i.name = "_execute_browser_action") {
            return i.shortcut;
        }
    }
    return null;
}

function initUI() {
  chrome.identity.getAuthToken({
    'interactive': false
  }, function(token) {
    // Use the token.
    if (!token) {
      //if (!bgPage.oauth.hasToken()) {
      document.getElementById('revoke').disabled = true;
    } else {
      console.log('Success!', token);
      access_token = token;
      document.getElementById('revoke').disabled = false;
    }
    if (chrome.runtime.lastError) {
        console.log('Oops', chrome.runtime.lastError);
    }

  });
}

//Inital function fired on page load.
window.onload = function() {
  initUI();
  initCommands();
  document.getElementById('configure').addEventListener('click',(e)=>{
      chrome.tabs.create({ url: "chrome://extensions/configureCommands" });
  });
};
