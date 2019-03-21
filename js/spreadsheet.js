//On load.
window.onload = function () {
    // console.log("Hello World");
    //Parse document key from URL
    //Pass the key to the background page

    //Callback? Listener?
    //Wait for response- if bgpage indicates that this is a compatible doc continue. Else break.
    //Construct citable menu html element.

    //goog-toolbar-menu-button-hover Toggle class on hover.
    //goog-toolbar-menu-button-open Toggle class on click.
    //'t-cloudboard' Hover new menu based on id.
    var citable_button = '<div id="t-citable" class="goog-toolbar-menu-button goog-inline-block" aria-disabled="false" role="button" style="-webkit-user-select: none; " aria-haspopup="true" aria-label="Citable" data-tooltip="Citable">' +
        '<div class="goog-toolbar-menu-button-outer-box goog-inline-block" style="-webkit-user-select: none; ">' +
        '<div class="goog-toolbar-menu-button-inner-box goog-inline-block" style="-webkit-user-select: none; ">' +
        '<div class="goog-toolbar-menu-button-caption goog-inline-block" style="-webkit-user-select: none; ">' +
        '<div class="docs-icon goog-inline-block citable-icon" style="-webkit-user-select: none; ">' +
        //'docs-icon-clipboard' Set new class for the new image. 16x16 icon.
        '<div class="docs-icon-citable" style="-webkit-user-select: none; ">' +
        '&nbsp;' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="goog-toolbar-menu-button-dropdown goog-inline-block " style="-webkit-user-select: none; ">' +
        '&nbsp;' +
        '</div>' +
        //Toggle this element's visibility on click. No horizontal rule between items.
        '<div id="menu" class="goog-menu menu goog-menu-noaccel" style="display:none">' +
        '<div id="t-cell-color-cond-fmt" class="goog-menuitem goog-option" onclick="fireCustomEvent(0);return false;">' +
        '<div class="goog-menuitem-content">Print on Post-its</div></div>' +
        '<div id="t-cell-color-cond-fmt" class="goog-menuitem goog-option" onclick="fireCustomEvent(1);return false;">' +
        '<div class="goog-menuitem-content">Export Citations</div></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div id="myCustomEventDiv" class="hidden"></div>' +
        '</div>';

    var script = document.createElement("script");
    script.type = "text/javascript";
    //script.src   = "path/to/your/javascript.js";    // use this for linked script
    script.text =
        "var customEvent = document.createEvent('Event');customEvent.initEvent('myCustomEvent', true, true);function fireCustomEvent(data) {hiddenDiv = document.getElementById('myCustomEventDiv');hiddenDiv.innerText = data;hiddenDiv.dispatchEvent(customEvent);console.log('fireCustomEvent ',data)}";
    document.body.appendChild(script);

    //Append header div with citable menu.
    /*<div id="docs-toolbar" class="goog-toolbar" style="-webkit-user-select: none; width: 1389px; " role="toolbar" tabindex="0" aria-activedescendant="">...*/
    $('#docs-toolbar').append(citable_button);



    //Shows the tool tip and the hover state.
    $('#t-citable').hover(
        function () {
            if ($('#menu').is(':hover')) {
                return;
            } else {
                $(this).addClass("goog-toolbar-menu-button-hover");
            }
        },
        function () {
            $(this).removeClass("goog-toolbar-menu-button-hover");
        });


    //Shows the menu
    $('#t-citable').click(
        function () {
            $(this).addClass("goog-toolbar-menu-button-open");
            event.stopPropagation();
        });

    //Hides the menu
    $('html').click(
        function () {
            $('#t-citable').removeClass("goog-toolbar-menu-button-open");
        });

    console.log('Appended');

    addCommListener();
};

//Receives communication from the page and passes the message to bgPage.
function addCommListener() {
    var port = chrome.extension.connect();
    document.getElementById('myCustomEventDiv').addEventListener('myCustomEvent', function () {
        var eventData = document.getElementById('myCustomEventDiv').innerText;
        console.log('myCustomEventListener ', eventData);
        port.postMessage({
            message: "myCustomEvent",
            values: eventData
        });
    });
}

/*var callBgPage = function(action, callback){
	console.log("callBgPage ",action);
	chrome.extension.connect().postMessage(action);
	if(callback) { callback(); }
}*/

//Function to call the bgpage print function.

//Function to call the bgpage export function.