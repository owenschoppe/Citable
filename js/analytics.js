/* jshint ignore:start */
var _AnalyticsCode = 'UA-30552255-1';

(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {
        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
        m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');


ga('create', _AnalyticsCode, 'auto');

ga('set', 'checkProtocolTask', null); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
// Sets the page value on the tracker.
ga('set', 'page', location.pathname);
var manifestData = chrome.runtime.getManifest();
ga('set', 'dimension1', manifestData.version);
// Sending the pageview no longer requires passing the page
// value since it's now stored on the tracker object.
ga('send', 'pageview');

window.onerror = function (message, source, lineno, colno, error) {
    console.log('Caught Error', message, source, lineno, colno, error);
    ga('send', 'event', 'Error', source, `${message}, ${lineno}, ${colno}`);
};
/* jshint ignore:end */

function initAnalytics(response) {
    if (response.analytics != undefined) {
        window['ga-disable-UA-30552255-1'] = !response.analytics;
    }
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    // for (var key in changes) {
    //     var storageChange = changes[key];
    //     console.log('Storage key "%s" in namespace "%s" changed. ' +
    //         'Old value was "%s", new value is "%s".',
    //         key,
    //         namespace,
    //         storageChange.oldValue,
    //         storageChange.newValue);
    // }
    if (changes.analytics != undefined && namespace == 'sync') {
        console.log(changes.analytics.newValue);
        initAnalytics({
            analytics: changes.analytics.newValue
        });
    }
});

chrome.storage.sync.get('analytics', initAnalytics);