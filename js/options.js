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
        xhr.send();
        // @corecode_end removeAndRevokeAuthToken

        // Update the user interface accordingly
        //changeState(STATE_START);
        document.getElementById('revoke').disabled = true;
        console.log('Token revoked and removed from cache. ' +
          'Check chrome://identity-internals to confirm.');
      }
    });
}

function initUI() {
  chrome.identity.getAuthToken({
    'interactive': true
  }, function(token) {
    // Use the token.
    if (!token) {
      //if (!bgPage.oauth.hasToken()) {
      document.getElementById('revoke').disabled = true;
    } else {
      console.log('Success!', token);
      access_token = token;
    }

  });
}

//Inital function fired on page load.
window.onload = function() {
  initUI();
};
