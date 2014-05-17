var bgPage = chrome.extension.getBackgroundPage();
//var access_token;

document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#revoke').addEventListener('click', revokeToken);
});

$('#refresh_rate').change(function() {
localStorage.refreshRate = $(this).val();
bgPage.refreshRate = localStorage.refreshRate;
bgPage.pollIntervalMin =  bgPage.refreshRate * 1000;
});

//Broken
/*function logout(e) {
	console.log('Logout',access_token);
	//chrome.identity.getAuthToken({ 'interactive': false }, function(access_token) {
		
		console.log('revoke');
		//From chrome://identity-internals/ identity-internals.js
		//chrome.send('identityInternalsRevokeToken', [chrome.runtime.id, access_token]);
		chrome.identity.identityInternalsRevokeToken(chrome.runtime.id, access_token);
		
		//Doesn't revoke the token, only used to refresh a stale token.
		//chrome.identity.removeCachedAuthToken({ 'token': access_token }, function(){
		//	$('#revoke').get(0).disabled = true; 
		//});
	//});
}*/

 function revokeToken() {
    //user_info_div.innerHTML="";
    chrome.identity.getAuthToken({ 'interactive': true },
      function(current_token) {
        if (!chrome.runtime.lastError) {

          // @corecode_begin removeAndRevokeAuthToken
          // @corecode_begin removeCachedAuthToken
          // Remove the local cached token
          chrome.identity.removeCachedAuthToken({ token: current_token },
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
          $('#revoke').get(0).disabled = true; 
          console.log('Token revoked and removed from cache. '+
            'Check chrome://identity-internals to confirm.');
        }
    });
  }

function initUI() {
	chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
	    // Use the token.
		if (!token){
			//if (!bgPage.oauth.hasToken()) {
			$('#revoke').get(0).disabled = true;
		} else {
			console.log('Success!',token);
			access_token = token;
		}
		
	});
}

if (localStorage.refreshRate) {
  $('#refresh_rate').val(localStorage.refreshRate);
} else {
   $('#refresh_rate').val(bgPage.refreshRate);
}


//Inital function fired on page load.
window.onload = function(){
	initUI();
};