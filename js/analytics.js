var _AnalyticsCode = 'UA-30552255-1';



// var _gaq = _gaq || [];
// _gaq.push(['_setAccount', _AnalyticsCode]);
// _gaq.push(['_gat.forceSSL']);
// _gaq.push(['_trackPageview']);
// _gaq.push(['dimension1', chrome.runtime.getManifest().version]);

// (function() {
//   var ga = document.createElement('script');
//   ga.type = 'text/javascript';
//   ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0];
//   s.parentNode.insertBefore(ga, s);
// })();



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
// Sending the pageview no longer requires passing the page
// value since it's now stored on the tracker object.
ga('send', 'pageview');

window.onerror = function (message, source, lineno, colno, error) {
    console.log('Caught Error', message, source, lineno, colno, error);
    // _gaq.push(['_trackEvent', 'Error', source, `${message}, ${lineno}, ${colno}`]);
    ga('send', 'event', 'Error', source, `${message}, ${lineno}, ${colno}`);
};