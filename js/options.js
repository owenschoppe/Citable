var bgPage = chrome.extension.getBackgroundPage();

document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#revoke').addEventListener('click', logout);
});

$('#refresh_rate').change(function() {
localStorage.refreshRate = $(this).val();
bgPage.refreshRate = localStorage.refreshRate;
bgPage.pollIntervalMin =  bgPage.refreshRate * 1000;
});

function logout(e) {
bgPage.logout();
$('#revoke').get(0).disabled = true;
}

function initUI() {
if (!bgPage.oauth.hasToken()) {
  $('#revoke').get(0).disabled = true;
}

if (localStorage.refreshRate) {
  $('#refresh_rate').val(localStorage.refreshRate);
} else {
   $('#refresh_rate').val(bgPage.refreshRate);
}
}

//Inital function fired on page load.
window.onload = function(){
	initUI();
};