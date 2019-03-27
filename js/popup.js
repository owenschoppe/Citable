/*
Copyright 2019 Owen Schoppe

Code may not be used without written and express permission.
*/

//Begin closure
(function () {

    function onError(e) {
        console.log(e);
    }

    //-----------//
    //Main Module//
    //-----------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //Original
    var citable = angular.module('gDriveApp', []);

    citable.config([
        '$compileProvider',
        function ($compileProvider) {
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|chrome-extension):/);
        }
    ]);

    citable.directive('tagsDirective', ['$compile', function ($compile) {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {

                var getDocumentSuccess = function (response) {
                    //the background page pushes the tags into local storage
                    chrome.storage.local.get('tags', gotTags.bind(this));
                };

                var gotTags = function (response) {
                    if (response) {
                        // console.log(response.tags);
                        this.tagsInput.setTagOptions(response.tags);
                    }
                };

                $scope.tagsInput = new Tags.TagInput('Tags', 'Enter a tag', (items) => {
                    // console.log('tags callback',items);
                    // $scope.tags = items;
                    $scope.data.citation.Tags = items ? items.join(', ') : null;
                    $scope.$apply();
                });

                $scope.$watch('data.defaultDoc', function (value) {
                    //When the default doc is set, get the tags
                    // console.log('watch default doc and refresh tags', value);
                    //Clear tags
                    $scope.tagsInput.setTagOptions([]);
                    if ($scope.data.defaultDoc) {
                        //If there is a new doc, then update the tags
                        var bgPage = chrome.extension.getBackgroundPage();
                        bgPage.getDocument(null, $scope.data.defaultDoc.id, true, getDocumentSuccess.bind($scope));
                    }
                });

                var el = $compile($scope.tagsInput.div)($scope);
                $element.append(el);
            }
        };
    }]);

    //---------------//
    //Show Validation//
    //---------------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.directive('shownValidation', function () {
        return {
            require: '^form',
            restrict: 'A',
            link: function (scope, element, attrs, form) {
                var control;

                scope.$watch(attrs.ngShow, function (value) {
                    if (!control) {
                        control = form[element.attr("name")];
                    }
                    if (value == true) {
                        form.$addControl(control);
                        angular.forEach(control.$error, function (validity, validationToken) {
                            form.$setValidity(validationToken, !validity, control);
                        });
                    } else {
                        form.$removeControl(control);
                    }
                });
            }
        };
    });

    //-----//
    //Focus//
    //-----//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.directive('selFocus', ['$timeout', '$parse', function ($timeout, $parse) {
        return {
            //scope: true,   // optionally create a child scope
            link: function (scope, element, attrs) {
                var model = $parse(attrs.selFocus);
                scope.$watch(model, function (value) {
                    console.log('value=', value);
                    if (value === true) {
                        $timeout(function () {
                            element[0].focus();
                        }, 200);
                    }
                });
                element.bind('blur', function () {
                    console.log('blur');
                    // scope.$apply(model.assign(scope, false));
                });
            }
        };
    }]);

    //-----------//
    //Google Docs//
    //-----------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //Creates a service called gdocs
    citable.factory('gdocs', [function () {
        console.log('run GDocs constructor');
        //var gdocs = new GDocs();

        var bgPage = chrome.extension.getBackgroundPage();
        var gdocs = bgPage.gdocs;

        return gdocs;
    }]);

    //------//
    //onLine//
    //------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.factory('onLine', ['sharedProps', '$window', '$rootScope', function (sharedProps, $window, $rootScope) {
        console.log('onLine constructor');

        function updateOnlineStatus(event) {
            //var condition = $window.navigator.onLine ? "online" : "offline";
            //Update the property.
            sharedProps.data.online = $window.navigator.onLine;
            //Force angular to update references property.
            $rootScope.$digest();
            //console.log(condition,sharedProps.data.online);
        }

        $window.addEventListener('online', updateOnlineStatus);
        $window.addEventListener('offline', updateOnlineStatus);
        //Update the property on init.
        sharedProps.data.online = $window.navigator.onLine;
        return true;
    }]);

    //------------//
    //Shared Props//
    //------------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.factory('sharedProps', [function () {
        //private variable
        var props = {};
        //set init values
        //ORDER: 'Title','Url','Date','Author','Summary','Tags'
        props.citation = {
            'Title': '',
            'Url': '',
            'Date': '',
            'Author': '',
            'Summary': '',
            'Tags': ''
        };
        props.citationMeta = {
            'fresh': false,
            'callback': null
        };
        props.menu = false;
        props.docs = [];
        props.defaultDoc = '';
        props.butter = {
            'status': '',
            'message': ''
        };
        props.loading = true;
        props.requesting = false;
        props.oldFolderName = 'Citable_Documents';
        props.folderName = 'Citable';
        props.driveProperties = [{
            'key': 'Citable',
            'value': 'true',
            'visibility': 'PUBLIC'
        }];
        props.auth = false;
        props.online = false;
        /*props.defaultMeta = props.docs.filter(function(el){
            return el.id == props.defaultDoc;
          });*/


        //Function that creates a tabindex for all elements that call it.
        var elArray = [];
        props.getIndex = function (el) {
            var index = elArray.indexOf(el);
            if (index > -1) {
                return index + 1;
            } else {
                elArray.push(el);
                return elArray.length();
            }
        };

        return {
            //public variables to expose private variables
            data: props
        };
    }]);

    //---------------//
    //Message Service//
    //---------------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.factory('msgService', ['$rootScope', '$timeout', 'sharedProps', function ($rootScope, $timeout, sharedProps) {

        //Message object singleton.
        butter = {
            message: '',
            status: ''
        };

        //Public API for the queue object.
        var queueMsg = function (msg, status, delay) {
            queue.add_function(function (callback) {
                showMsg(msg, status, delay, callback);
            });
        };

        //Public API to queue generic functions.
        var queueFn = function (fn) {
            queue.add_function(fn);
        };

        //Private instance of the Queue object.
        var queue = new Queue();

        //Update the message object, 'butter'.
        var showMsg = function (message, status, delay, callback) {

            $timeout(function () {
                var defaultDelay = 1500;
                status = status != null && status != '' ? status.trim().toLowerCase() : 'normal'; //Normalize the status parameter.
                message = message != null && message != '' ? message.toString() : ''; //Normalize the message.
                console.log('showMsg', message, status, delay, callback, Date.now());

                butter.status = status;
                butter.message = message;

                if (delay > 0) {
                    delay = delay > defaultDelay ? delay : defaultDelay; //Enforces minimum time on messages.
                    console.log('Submit clearMsg $timeout', Date.now());
                    //By allowing persisent messages we can avoid ever having messages cleared prematurely.
                    var clearMsg = $timeout(function () {
                        butter.status = '';
                        butter.message = '';
                        //TODO: Add fadout animation using ngAnimage and $animate?
                        if (callback) callback();
                    }, delay);

                    //Callbacks using $timeout promises
                    clearMsg.then(
                        function () {
                            console.log("clearMsg resolved", Date.now());
                        },
                        function () {
                            console.log("clearMsg canceled", Date.now());
                        }
                    );
                } else {
                    //Resets the queue without clearing persistant messages. The next message will still replace it after the defaultDelay.
                    $timeout(function () {
                        if (callback) callback();
                    }, defaultDelay);
                }

            }, 0);
        };
        //Public API for private functions.
        //For displaying the messages
        //For queueing messages
        //For queueing any function
        return {
            butter: butter,
            queue: queueMsg,
            queueFn: queueFn
        };
    }]);

    //----------------//
    //Keyboard Manager//
    //----------------//
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // This service was based on OpenJS library available in BSD License
    // http://www.openjs.com/scripts/events/keyboard_shortcuts/index.php
    citable.factory('keyboardManager', ['$window', '$timeout', function ($window, $timeout) {
        var keyboardManagerService = {};

        var defaultOpt = {
            'type': 'keydown',
            'propagate': false,
            'inputDisabled': false,
            'target': $window.document,
            'keyCode': false
        };
        // Store all keyboard combination shortcuts
        keyboardManagerService.keyboardEvent = {};
        // Add a new keyboard combination shortcut
        keyboardManagerService.bind = function (label, callback, opt) {
            var fct, elt, code, k;
            // Initialize opt object
            opt = angular.extend({}, defaultOpt, opt);
            label = label.toLowerCase();
            elt = opt.target;
            if (typeof opt.target == 'string') elt = document.getElementById(opt.target);

            fct = function (e) {
                e = e || $window.event;

                // Disable event handler when focus input and textarea
                if (opt.inputDisabled) {
                    var elt;
                    if (e.target) elt = e.target;
                    else if (e.srcElement) elt = e.srcElement;
                    if (elt.nodeType == 3) elt = elt.parentNode;
                    if (elt.tagName == 'INPUT' || elt.tagName == 'TEXTAREA') return;
                }

                // Find out which key is pressed
                if (e.keyCode) code = e.keyCode;
                else if (e.which) code = e.which;
                var character = String.fromCharCode(code).toLowerCase();

                if (code == 188) character = ","; // If the user presses , when the type is onkeydown
                if (code == 190) character = "."; // If the user presses , when the type is onkeydown

                var keys = label.split("+");
                // Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
                var kp = 0;
                // Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
                var shift_nums = {
                    "`": "~",
                    "1": "!",
                    "2": "@",
                    "3": "#",
                    "4": "$",
                    "5": "%",
                    "6": "^",
                    "7": "&",
                    "8": "*",
                    "9": "(",
                    "0": ")",
                    "-": "_",
                    "=": "+",
                    ";": ":",
                    "'": "\"",
                    ",": "<",
                    ".": ">",
                    "/": "?",
                    "\\": "|"
                };
                // Special Keys - and their codes
                var special_keys = {
                    'esc': 27,
                    'escape': 27,
                    'tab': 9,
                    'space': 32,
                    'return': 13,
                    'enter': 13,
                    'backspace': 8,

                    'scrolllock': 145,
                    'scroll_lock': 145,
                    'scroll': 145,
                    'capslock': 20,
                    'caps_lock': 20,
                    'caps': 20,
                    'numlock': 144,
                    'num_lock': 144,
                    'num': 144,

                    'pause': 19,
                    'break': 19,

                    'insert': 45,
                    'home': 36,
                    'delete': 46,
                    'end': 35,

                    'pageup': 33,
                    'page_up': 33,
                    'pu': 33,

                    'pagedown': 34,
                    'page_down': 34,
                    'pd': 34,

                    'left': 37,
                    'up': 38,
                    'right': 39,
                    'down': 40,

                    'f1': 112,
                    'f2': 113,
                    'f3': 114,
                    'f4': 115,
                    'f5': 116,
                    'f6': 117,
                    'f7': 118,
                    'f8': 119,
                    'f9': 120,
                    'f10': 121,
                    'f11': 122,
                    'f12': 123
                };
                // Some modifiers key
                var modifiers = {
                    shift: {
                        wanted: false,
                        pressed: e.shiftKey ? true : false
                    },
                    ctrl: {
                        wanted: false,
                        pressed: e.ctrlKey ? true : false
                    },
                    alt: {
                        wanted: false,
                        pressed: e.altKey ? true : false
                    },
                    meta: { //Meta is Mac specific
                        wanted: false,
                        pressed: e.metaKey ? true : false
                    }
                };
                // Foreach keys in label (split on +)
                for (var i = 0, l = keys.length; k = keys[i], i < l; i++) {
                    switch (k) {
                        case 'ctrl':
                        case 'control':
                            kp++;
                            modifiers.ctrl.wanted = true;
                            break;
                        case 'shift':
                        case 'alt':
                        case 'meta':
                            kp++;
                            modifiers[k].wanted = true;
                            break;
                    }

                    if (k.length > 1) { // If it is a special key
                        if (special_keys[k] == code) kp++;
                    } else if (opt.keyCode) { // If a specific key is set into the config
                        if (opt.keyCode == code) kp++;
                    } else { // The special keys did not match
                        if (character == k) kp++;
                        else {
                            if (shift_nums[character] && e.shiftKey) { // Stupid Shift key bug created by using lowercase
                                character = shift_nums[character];
                                if (character == k) kp++;
                            }
                        }
                    }
                }

                if (kp == keys.length &&
                    modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
                    modifiers.shift.pressed == modifiers.shift.wanted &&
                    modifiers.alt.pressed == modifiers.alt.wanted &&
                    modifiers.meta.pressed == modifiers.meta.wanted) {
                    $timeout(function () {
                        callback(e);
                    }, 1);

                    if (!opt.propagate) { // Stop the event
                        // e.cancelBubble is supported by IE - this will kill the bubbling process.
                        e.cancelBubble = true;
                        e.returnValue = false;

                        // e.stopPropagation works in Firefox.
                        if (e.stopPropagation) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        return false;
                    }
                }

            };
            // Store shortcut
            keyboardManagerService.keyboardEvent[label] = {
                'callback': fct,
                'target': elt,
                'event': opt.type
            };
            //Attach the function with the event
            if (elt.addEventListener) elt.addEventListener(opt.type, fct, false);
            else if (elt.attachEvent) elt.attachEvent('on' + opt.type, fct);
            else elt['on' + opt.type] = fct;
        };
        // Remove the shortcut - just specify the shortcut and I will remove the binding
        keyboardManagerService.unbind = function (label) {
            label = label.toLowerCase();
            var binding = keyboardManagerService.keyboardEvent[label];
            delete(keyboardManagerService.keyboardEvent[label]);
            if (!binding) return;
            var type = binding.event,
                elt = binding.target,
                callback = binding.callback;
            if (elt.detachEvent) elt.detachEvent('on' + type, callback);
            else if (elt.removeEventListener) elt.removeEventListener(type, callback, false);
            else elt['on' + type] = false;
        };
        //
        return keyboardManagerService;
    }]);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.controller('authController', ['$scope', 'sharedProps', 'onLine', 'msgService', function ($scope, sharedProps, onLine, msgService) {
        $scope.data = sharedProps.data;
        $scope.getAuthFlow = false;

        var bgPage = chrome.extension.getBackgroundPage();

        //Toggle auth on button press.
        $scope.getAuth = function () {
            $scope.getAuthFlow = true;
            console.log('getAuth');
            //stored in backgroundpage for persistance and universal access within the app.
            bgPage.toggleAuth(true, function (token) {
                $scope.getAuthFlow = false;
                console.log('getAuth callback', token);
                if (token) {
                    $scope.data.auth = true;
                    console.log('$scope.data.auth', $scope.data.auth);

                    //!!! We never reach this.... since auth doesn't return if it fails.
                } else {
                    //We never reach this code because the popup closes when the auth flow launches.
                    $scope.data.auth = false;
                    console.log('getAuth callback else', token);
                    msgService.queue('Authorization Failed', 'error');
                }
                $scope.$digest();
            });
        };

        //Watch online and do a soft check (non-interactive) for auth everytime we go online.
        $scope.$watch('data.online', function (newValue, oldValue) {
            console.log('$scope.$watch(data.online) authCtrl', $scope.data.online);
            //$scope.data.loading = false;
            if ($scope.data.online) {
                //Kick things off on init.
                bgPage.toggleAuth(false, function (token) {
                    if (token) {
                        //We got auth, so update the flag to trigger fetchFolder() watcher.
                        console.log('getAuth init Succeed', token);
                        $scope.data.auth = true;
                    } else {
                        //We failed to get auth. Pause loading and show the button.
                        console.log('getAuth init Fail', token);
                        $scope.data.auth = false;
                    }
                    $scope.data.loading = false;
                    $scope.$digest();
                });
            }
        });

    }]);


    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //A controller to let us reorganize the html.
    //Technically, not necessary since both the controller scope and directive are possible within DocsController, but it's cleaner.
    //The fix for the rendering was to use ng-bind instead of {{}} to update the message.
    //ng-bind watches the input variable and updates when it changes.
    citable.controller('butterController', ['$scope', 'sharedProps', 'onLine', 'msgService', function ($scope, sharedProps, onLine, msgService) {
        $scope.data = sharedProps.data;
        $scope.butter = msgService.butter;

        //Updates the butter class to match the status stored in the singleton.
        $scope.butterClass = function () {
            var status = $scope.butter.status;
            status = status || 'normal';
            console.log('butter ' + status);
            return 'butter pam ' + status;
        };

    }]).directive('boxButter', function () {
        return {
            template: '<div ng-class="butterClass()" ng-bind="butter.message" ng-show="butter.message"></div>'
        };
    });


    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.controller('menuController', ['$scope', 'sharedProps', function ($scope, sharedProps) {
        $scope.data = sharedProps.data;

        $scope.toggleMenu = function (event) {
            ga('send', 'event', 'Button', 'Toggle Menu');
            event.preventDefault();
            if ($scope.data.defaultDoc.title) {
                $scope.data.menu = !$scope.data.menu;
            }
        };
    }]);


    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.controller('actionController', ['$scope', '$http', 'gdocs', 'sharedProps', 'msgService', function ($scope, $http, gdocs, sharedProps, msgService) {
        console.log('SCOPE on Init', $scope.data);

        $scope.data = sharedProps.data;

        var bgPage = chrome.extension.getBackgroundPage();

        //Pass the incomming param to the background page.
        $scope.getDocument = function (param) {
            console.log('SCOPE on getDocument', $scope.data);

            $scope.data.requesting = true; //Set the variable.

            //Consider print to be an explicit action and save this file as the default for future use.
            //This also makes the title and id available to the background page via chrome.storage.sync.get()
            $scope.storeDefault();

            bgPage.getDocument(param, $scope.data.defaultDoc.id, true, function (response) {
                if (response != null) {
                    //success
                    msgService.queue(param.toProperCase() + ' ' + $scope.data.defaultDoc.title, 'normal', 5000);
                    $scope.closeWindow();
                } else {
                    //failure
                    msgService.queue(status + "Couldn't Get Document", 'error');
                }
                $scope.data.requesting = false; //Reset the variable.
            });
        };

        $scope.donate = function (param) {
            console.log('donate', param);
            ga('send', 'event', 'Button', 'Donate', 'Popup');
            chrome.tabs.create({
                url: param
            });
            window.close();
        };
    }]);


    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    citable.controller('CitationController', ['$scope', 'sharedProps', '$rootScope', function ($scope, sharedProps, $rootScope) {

        var bgPage = chrome.extension.getBackgroundPage();

        $scope.data = sharedProps.data; //shared 2-way data binding to factory object

        $scope.getPageInfo = function () {
            console.log('getPageInfo');
            bgPage.getPageInfo($scope.setCitation);
        };

        $scope.setCitation = function (pageInfo) {
            //Reset the flag
            $scope.data.citationMeta.fresh = true;

            //General loop for passing pageInfo values to the sharedProps object.
            for (var i in pageInfo) {
                $scope.data.citation[i] = decodeURIComponent(pageInfo[i]);
            }

            function currDate() {
                var d = new Date();
                var curr_date = d.getDate();
                var curr_month = d.getMonth() + 1; //months are zero based
                var curr_year = d.getFullYear();
                return curr_year + '/' + curr_month + '/' + curr_date;
            }

            $scope.data.citation.Date = currDate();

            console.log('citation', $scope.data.citation);

            //Super simple function queue, should I implement a full queue?
            if ($scope.data.citationMeta.callback) {
                //Run it.
                $scope.data.citationMeta.callback();
                //Clear it out.
                $scope.data.citationMeta.callback = null;
            }

            console.log('setCitation', pageInfo, $scope.data.citation);
            $scope.$digest();
        };

        //Dumb startup
        //$scope.getPageInfo();

        //Watcher to update the note data if it gets stale.
        //Lets us set the stale flag on ctrl-return and trigger a refresh for video logging.
        //Still grabs the selection, so clearing the field doesn't work.
        //Ok since you shouldn't make a selection if you are going to use this feature.
        $scope.$watch('data.citationMeta.fresh', function (newValue, oldValue) {
            console.log('$scope.$watch(data.citationMeta.fresh) citationCtrl', $scope.data.citationMeta.fresh);
            if (!$scope.data.citationMeta.fresh) {
                //Update the note
                $scope.getPageInfo();
            }
        });

    }]);


    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // Main Angular controller for app.
    //function DocsController($scope, $http, gdocs) { //Use this if not using closure.
    citable.controller('DocsController', ['$scope', '$http', '$timeout', 'gdocs', 'sharedProps', 'keyboardManager', 'msgService', function ($scope, $http, $timeout, gdocs, sharedProps, keyboardManager, msgService) {
        $scope.data = sharedProps.data; //shared 2-way data binding to factory object
        //$scope.docs = $scope.data.docs; //Alias the docs prop for easy access. DOES NOT WORK
        $scope.cats = []; //Shared cats within controller

        console.log('gdocs', gdocs);

        var bgPage = chrome.extension.getBackgroundPage();

        // Bind ctrl+return
        // Save the note but don't close the popup
        keyboardManager.bind('ctrl+return', function (e) {
            if ($scope.data.online) {
                if ($scope.controls.$valid) {
                    $scope.saveNote(e, function () {
                        $scope.data.citationMeta.fresh = false;
                        $scope.data.citationMeta.callback = $scope.clearFields;
                        //TODO: Since we're refreshing the note, we can't clear the field. Maybe do it on fresh?
                        //$scope.clearFields();
                        $scope.data.requesting = false; // User may need to click the button again.
                    });
                    ga('send', 'event', 'Shortcut', 'CTRL RETURN');
                } else {
                    msgService.queue('Please Add a Title', 'error', 5000);
                }
            }
        });

        // Bind alt+return
        // Save the note and close the popup
        keyboardManager.bind('alt+return', function (e) {
            if ($scope.data.online) {
                if ($scope.controls.$valid) {
                    $scope.saveNote(e, $scope.closeWindow);
                    ga('send', 'event', 'Shortcut', 'ALT RETURN');
                } else {
                    msgService.queue('Please Add a Title', 'error', 5000);
                }
            }
        });

        ///////////
        //Startup//
        ///////////

        //Watch the value of data.online for changes and run the function if so.
        $scope.$watch('data.online', function (newValue, oldValue) {
            console.log('$scope.$watch(data.online) docCtrl', $scope.data.online);
            if (!$scope.data.online) {
                msgService.queue('Offline', 'error');
            } else if ($scope.data.online && oldValue === false) {
                msgService.queue('Online', 'normal', 1500);
                if ($scope.data.auth) $scope.fetchFolder(false);
                //TODO: check $scope.data.docs or some other variable to insure that we don't already have the select menu loaded.
            }
        });

        //Watch the value of data.auth for changes and run fetchFolder() if online too.
        $scope.$watch('data.auth', function (newValue, oldValue) {
            console.log('$scope.$watch(data.auth) docCtrl', newValue);
            if ($scope.data.auth) {
                if ($scope.data.online) $scope.fetchFolder(false);
            }
        });

        ///////////


        //Retreive and update the defaultDoc based on local storage
        storageSuccess = function (items) {
            //update sharedProps values
            $scope.data.defaultDoc = items.defaultDoc;
            //$scope.updateMeta($scope.data.defaultDoc);
            console.log('Settings retrieved', items, items.defaultDoc, $scope.data.defaultDoc);
        };
        chrome.storage.sync.get('defaultDoc', storageSuccess);

        //Update the default meta any time the storage value changes.
        //We could also update the defaultDoc to guarantee everything stays in sync, but since we only trigger storage when we update it should be fine.
        //chrome.storage.onChanged.addListener(function(resp){$scope.updateMeta(resp.defaultDoc.newValue)});

        console.log('sharedProps on DocsController init', $scope.data);

        // Response handler that caches file icons in the filesystem API.
        function successCallbackWithFsCaching(resp, status, headers, config, statusText) {
            console.log('successCallbackWithFsCaching', resp, status, headers, config, statusText);

            $scope.data.loading = false;

            if (!resp.items.length) {
                console.log('No docs in list.', $scope);
                msgService.queue('Welcome to Citable!', 'normal', 2000);
                //No docs in doc list, create new document.
                $scope.data.defaultDoc = null;
                $scope.clearDocs();
                //$scope.data.docs = [{'id':'','title':'Create New Document'}];
                //$scope.$apply(function($scope){});
            } else {

                var totalEntries = resp.items.length;

                resp.items.forEach(function (entry, i) {

                    var doc = buildDocEntry(entry);
                    $scope.data.docs.push(doc);
                    // Only want to sort and call $apply() when we have all entries.
                    if (totalEntries - 1 == i) {
                        $scope.data.docs.sort(Util.sortByDate);
                        //$scope.data.docs = $scope.docs; //?? Aliasing didn't work, so we had to make an explicit redefinition.

                        //$scope.defaultDoc = $scope.docs[0].alternateLink;
                        //$scope.$apply(function($scope) {}); // Inform angular we made changes.
                    }
                });
                console.log('Documents List', $scope.data.docs, $scope.data.defaultDoc);
                //msgService.queue('Got Docs!','success',2000);

                //We have docs, so reset the defaultDoc if it isn't set already.
                //TODO: check if document is in the list of docs. If not reset the default.
                if (!$scope.data.defaultDoc) {
                    console.log('Reset Default');
                    //Temporarily reset the default value, if there isn't a predefined default.
                    $scope.data.defaultDoc = $scope.data.docs[0];
                    //Don't automatically store this default. Instead continue to reset to the latest file until the user makes an explicit selection.
                } else {
                    var defaultFound = false;
                    for (var i in $scope.data.docs) {
                        doc = $scope.data.docs[i];
                        //console.log($scope.data.defaultDoc.id, i, doc.id, $scope.data.defaultDoc.id == doc.id)
                        if ($scope.data.defaultDoc.id == doc.id) {
                            defaultFound = true;
                        }
                    }
                    console.log('Default Found', defaultFound);
                    //Permanently redefine the default if the defaultDoc isn't in the doc list. By storing this we prevent ongoing mis-saves in a deleted doc.
                    if (defaultFound == false) {
                        $scope.data.defaultDoc = $scope.data.docs[0];
                        $scope.storeDefault();
                    }
                }
            }
        }

        buildDocEntry = function (entry) {
            return {
                title: entry.title,
                id: entry.id,
                updatedDate: Util.formatDate(entry.modifiedDate),
                updatedDateFull: entry.modifiedDate,
                icon: entry.iconLink,
                size: entry.fileSize ? '( ' + entry.fileSize + ' bytes)' : null,
                alternateLink: entry.alternateLink
            };
        };

        $scope.clearDocs = function () {
            $scope.data.docs = []; // Clear out old results.
        };

        $scope.fetchDocs = function (retry, folderId) {
            //Probably unnecessary since we just did it in the fetchFolder step.
            //this.clearDocs();


            //Query had to be restructured to use the full mimeType instead of using the contains logic. Evidently the new sheets don't store the mimeType as a string or it's being abstracted somehow resulting in only old sheets appearing.
            //"mimeType contains 'sheet' and '"+
            if (gdocs.accessToken) {
                var config = {
                    params: {
                        'alt': 'json',
                        'q': "mimeType = 'application/vnd.google-apps.spreadsheet' and '" + folderId + "' in parents and trashed!=true"
                    },
                    headers: {
                        'Authorization': 'Bearer ' + gdocs.accessToken
                    }
                };

                $http.get(gdocs.DOCLIST_FEED, config)
                    .then(function onSuccess(response) {
                        var data = response.data;
                        var status = response.status;
                        var statusText = response.statusText;
                        var headers = response.headers;
                        var config = response.config;
                        successCallbackWithFsCaching(data, status, headers, config, statusText);
                    })
                    .catch(function onError(response) {
                        var data = response.data;
                        var status = response.status;
                        var statusText = response.statusText;
                        var headers = response.headers;
                        var config = response.config;
                        if (status == 401 && retry) {
                            gdocs.removeCachedAuthToken(
                                gdocs.auth.bind(gdocs, true,
                                    $scope.fetchDocs.bind($scope, false)));
                        } else {
                            msgService.queue('Oops ' + status, 'error');
                        }
                    });
            }
        };

        $scope.fetchFolder = function (retry, opt_config) {
            var oldFolderName = $scope.data.oldFolderName;
            var folderName = $scope.data.folderName;

            $scope.data.loading = true;

            //Clear doc list from the select menu
            this.clearDocs();

            function successCallbackFolderId(resp, status, headers, config, statusText) {

                if (resp.items.length > 0) {
                    //Add the folder to $scope
                    resp.items.forEach(function (entry, i) {
                        $scope.cats.push(entry);
                    });
                    console.log('Folders', $scope.cats, bgPage.firstRun, $scope.cats[0].id, $scope.data.driveProperties);

                    //If this is the first run since an update, do some maintenance on the folder.
                    if (opt_config) {
                        //Update the old folders properties.
                        bgPage.insertProperties($scope.cats[0], $scope.data.driveProperties, function () {
                            //Rename the folder.
                            bgPage.renameFolder($scope.cats[0], folderName, function () {
                                msgService.queue('Folder Updated', 'normal', 1000);
                            });
                        });
                    }

                    //Uses the folderId so it's name independent from here on out.
                    //Get the files contained in the folder cats[0];
                    //TODO: recursively check all found folders to insure we get everything. (Might result in duplicates)
                    $scope.fetchDocs(false, $scope.cats[0].id);

                } else {
                    if (bgPage.firstRun == true) {
                        msgService.queue('Updating Folder...');
                        var updateFolderConfig = {
                            params: {
                                'alt': 'json',
                                'q': "mimeType = 'application/vnd.google-apps.folder' and title='" + oldFolderName + "' and trashed!=true"
                            },
                            headers: {
                                'Authorization': 'Bearer ' + gdocs.accessToken
                            }
                        };
                        $scope.fetchFolder(false, updateFolderConfig);
                    } else {
                        msgService.queue('Creating Folder...');
                        //No folders found, check for the old folder or create the folder
                        bgPage.createFolder(folderName, $scope.data.driveProperties, successCallbackFolderId);
                    }
                }

                //Reset the variable so we don't do this again.
                bgPage.firstRun = false;

            }


            if (gdocs.accessToken) {
                console.log('fetchFolder', gdocs.accessToken, bgPage.firstRun);

                //query: is a folder, properties contains Citable=true, is visible to PUBLIC, and isn't in the trash.
                var config = opt_config ? opt_config : {
                    params: {
                        'alt': 'json',
                        'q': "mimeType = 'application/vnd.google-apps.folder' and properties has { key='" + $scope.data.driveProperties[0].key + "' and value='" + $scope.data.driveProperties[0].value + "' and visibility='" + $scope.data.driveProperties[0].visibility + "' } and trashed!=true"
                    },
                    headers: {
                        'Authorization': 'Bearer ' + gdocs.accessToken
                    }
                };

                $http.get(gdocs.DOCLIST_FEED, config).
                then(function onSuccess(response) {
                    var data = response.data;
                    var status = response.status;
                    var statusText = response.statusText;
                    var headers = response.headers;
                    var config = response.config;
                    successCallbackFolderId(data, status, headers, config, statusText);
                }).
                catch(function onError(response) {
                    var data = response.data;
                    var status = response.status;
                    var statusText = response.statusText;
                    var headers = response.headers;
                    var config = response.config;
                    if (status == 401 && retry) {
                        gdocs.removeCachedAuthToken(
                            gdocs.auth.bind(gdocs, true,
                                $scope.fetchDocs.bind($scope, false)));
                    } else {
                        console.log('fetchFolder error', status, headers);
                        if (status == 0) {
                            msgService.queue('Offline', 'error');
                            //$scope.data.loading = false;
                            //return false;
                        } else {
                            msgService.queue('Oops ' + status, 'error');
                        }
                    }
                });
            }
        };

        //Handler for saving a new citation.
        $scope.amendDoc = function (retry, destination, callback) {
            console.log('gdocs.amendDoc..');

            //destination = destination!=null ? destination : $scope.data.newDoc;
            //In the new scheme, new doc selected and no default on init are indistinguishable... this might be ok.
            if ((destination === null || destination.id == '')) { // && $scope.data.newDoc //Manual validation... icky.
                console.log('bgPage.createDocument');
                msgService.queue('Creating New Spreadsheet...');

                bgPage.createDocument($scope.data.citation, $scope.data.newDoc.trim(), $scope.cats[0])
                    .then(function (response) {
                        console.log(response.title + ' created!', response, callback); //Works.
                        msgService.queue(response.title + ' Created', 'normal', 3000); //Works.

                        //Cleanup the new doc creation process.
                        $scope.data.newDoc = '';

                        //Add doc to the menu.
                        $scope.data.docs.unshift(buildDocEntry(response));

                        //Set doc as default.
                        $scope.data.defaultDoc = $scope.data.docs[0];

                        if (callback) callback(); //Doesn't get called...?
                    })
                    .catch(function (error) {
                        console.log('unable to create document');
                        msgService.queue(error.message, 'error', 3000);
                    });
            } else {
                console.log('destination: ', destination.id, destination.title);
                amendDocHandler(retry, destination.id, callback); //Call the handler passing in the formatted values.
            }
        };

        amendDocHandler = function (retry, docId, callback) {

            var handleSuccess = function (resp, status, headers, config, statusText) {
                console.log('gdocs.amendDoc handleSuccess');
                if (status != 201 && status != 200) {
                    console.log('AMEND ERROR', resp);
                    msgService.queue('Oops ' + status + ' Please Try Again', 'error');
                } else {
                    requestFailureCount = 0;
                    console.log('Amend: ', status, resp);
                    if (callback) callback();
                }
            };

            if (gdocs.accessToken) {
                msgService.queue('Saving Note...');

                var citationData = constructCitation();

                var config = {
                    //params: {},
                    headers: {
                        'Authorization': 'Bearer ' + gdocs.accessToken,
                        'GData-Version': '3.0',
                        'Content-Type': 'application/atom+xml'
                    } //,
                    //body: data
                };
                console.log('data to send', config, citationData);

                var worksheetId = 'default';

                var url = bgPage.SPREAD_SCOPE + '/list/' + docId + '/' + worksheetId + '/private/full';

                var onSuccess = function (response) {
                    var originalData = $scope.data.citation;
                    var success = checkResponse(response); //Add .bind() here to trigger error.
                    var data = response.data;
                    var status = response.status;
                    var statusText = response.statusText;
                    var headers = response.headers;
                    var config = response.config;
                    handleSuccess(data, status, headers, config, statusText);
                };

                var onError = function (response) {
                    var data = response.data;
                    var status = response.status;
                    var statusText = response.statusText;
                    var headers = response.headers;
                    var config = response.config;
                    var citation = $scope.data.citation;
                    if (status == 401 && retry) {
                        gdocs.removeCachedAuthToken(
                            gdocs.auth.bind(gdocs, true,
                                $scope.fetchDocs.bind($scope, false)));
                    } else if ((status == 400 || status == 500 || status == 404) && retry) {

                        console.log('Try updating headers: ', $scope.data.defaultDoc);
                        //Try updating the column headers to fix faulty docs.
                        //The second param is an optional doc so we don't update the whole list. We take the index of :selected and use just that doc from the docs array.
                        //The third param is also optional and means we check for the actual columns we're trying to set.
                        bgPage.updateDocument(updateDocumentCallback, $scope.data.defaultDoc, Object.keys(citation));

                        msgService.queue('Updating Headers...');

                    } else {
                        console.log('amend note error', status, data);
                        //$scope.saveNote.saveNoteFailure(status);
                        $scope.data.requesting = false; //Reset the variable.
                        msgService.queue(status + ' Problem With the Note', 'error');
                    }
                };

                var parseXml = function (xmlStr) {
                    return new window.DOMParser().parseFromString(xmlStr, "text/xml");
                };

                var editLink = '';

                var checkResponse = function (response) {
                    var citation = $scope.data.citation;
                    var doc = parseXml(response.data);
                    editLink = doc.querySelector('link[rel="edit"]').getAttribute('href') || '';
                    // var nonEmptyKeys = Object.keys(citation).filter((key) => citation[key]).map((key) => key.toLowerCase());
                    var missingColumnNames = [];
                    for (var key in citation) {
                        var foundColumn = doc.querySelector(key.toLowerCase());
                        if (foundColumn === null) {
                            missingColumnNames.push(key);
                            var col = document.createElement('gsx:' + key.toLowerCase());
                            col.innerHTML = Util.escapeHTML(citation[key]).replace(/&nbsp;/gi, ' ');
                            doc.querySelector('entry').appendChild(col);
                        }
                    }
                    if (missingColumnNames.length > 0 && editLink != '') {
                        //Update the column headers in the document to match the current citation and then update the row using id.
                        bgPage.updateDocument((response) => {
                            $http.put(editLink, doc.querySelector('entry').outerHTML, config)
                                .then(onSuccess)
                                .catch(onError);
                        }, $scope.data.defaultDoc, Object.keys(citation));
                    } else if (missingColumnNames > 0 && editLink == '') {
                        msgService.queue('Missing Column: ' + missingColumnNames, 'error', 3000);
                    }
                    return missingColumnNames.length == 0 ? true : false;
                };

                var updateDocumentCallback = function (error) {
                    console.log('updateHeaders complete', error);
                    if (!error) { //Only complete the callback if updateDocument didn't encounter an error.
                        $scope.updateHeaderSuccess(callback, editLink);
                    } else {
                        // $scope.data.requesting = false; //Reset the variable.
                        //Don't close the window.
                        //TODO: should we really queue the error?
                        msgService.queue(error + ' Check Your Document Columns', 'error');

                        //Exit the amend sequence and throw the error.
                        //$scope.saveNote.saveNoteFailure(error); //Not a function within this scope...
                    }
                };

                $http.post(url, citationData, config)
                    .then(onSuccess)
                    .catch(onError);

                console.log('Citation: ', url, config);
            }
        };

        var constructCitation = function () {
            return ["<?xml version='1.0' encoding='UTF-8'?>",
                    '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">',
                    Object.entries($scope.data.citation).map((entry, index, array) => {
                        return ['<gsx:', entry[0].toLowerCase(), '>', Util.escapeHTML(entry[1]).replace(/&nbsp;/gi, ' '), '</gsx:', entry[0].toLowerCase(), '>'].join('');
                    }),
                    '</entry>'
                ]
                .join('')
                .trim()
                .replace("^([\\W]+)<", "<"); //There are evidently bad characters in the XML that this regex removes.
        };

        $scope.updateHeaderSuccess = function (callback) {
            console.log('updateHeaderSuccess', callback);
            msgService.queue('Headers Updated');
            $scope.amendDoc(false, $scope.data.defaultDoc, callback); //Resubmit the add note request, without the retry flag.
        };

        // Controls the label of the authorize/deauthorize button.
        $scope.authButtonLabel = function () {
            if (gdocs.accessToken)
                return 'Deauthorize';
            else
                return 'Authorize';
        };

        //Actually want to show the selector either way? No, on return of no docs (ie, startup) show the new doc name field and hide the loading wheel.
        //gotDocs is just part of this logic, it should also consider the state of the doc list query.
        //On error, display error. On 200 OK evaluate doc list length.
        //Global variable with the state set. On callback success evaluate state and set global variable.
        $scope.gotDocs = function (index) {
            console.log('Docs length:', $scope.data.docs.length > 0);
            return (($scope.data.docs.length > 0) || (!$scope.data.loading)); //This is silly since docs is always 0 before loading and after loading we'll always show the menu either defaulted or empty.
        };

        $scope.getMenu = function () {
            return $scope.data.menu;
        };

        $scope.closeWindow = function () {
            msgService.queueFn(window.close);
        };

        $scope.clearFields = function () {
            //Clear citation.
            $scope.data.citation.Summary = null;
            $scope.$apply();
        };

        $scope.saveNoteButton = function (event, callback) {
            ga('send', 'event', 'Button', 'Save');
            $scope.saveNote(event, callback);
        };

        $scope.saveNote = function (event, callback) {
            console.log('Save Note: ', $scope.data);
            ga('send', 'event', 'Auto', 'Save Note');

            var saveNoteSuccess = function () {
                console.log('SaveNote success', $scope.data, callback);
                msgService.queue('Note Saved', 'success', 100);
                // $scope.data.requesting = false; //Reset the variable. //Don't reset unless this is a ctrl-click...

                //Remove citation from queue/log.

                //Consider save to be an explicit action and save this file as the default for future use.
                $scope.storeDefault();

                if (callback) {
                    callback();
                }
            };

            //TODO: should I push errors in the amend process to this function or just handle them individually?
            var saveNoteFailure = function (error) {
                console.log('SaveNote failure', $scope.data);
                msgService.queue('Oops '.concat(error, ' Please Try Again'), 'error');
                $scope.data.requesting = false; //Reset the variable.
                //Don't close the window.
            };

            if (!$scope.data.requesting && !$scope.getMenu()) {
                $scope.amendDoc(true, $scope.data.defaultDoc, saveNoteSuccess); //Amend the note, with retry enabled to update headers on error.
                $scope.data.requesting = true; //Set the global variable.
            }
        };

        $scope.viewDoc = function (destination, url) {
            console.log('viewDoc', destination, url);
            ga('send', 'event', 'Button', 'View Document');
            //First looks for the url passed in from the DocList API since that address should be correct.
            var tabUrl = url != null ? url : constructURL(destination);
            chrome.tabs.create({
                url: tabUrl
            });
            window.close();

            function constructURL(destination) {
                if (destination == '') {
                    return null;
                }
                return 'https://docs.google.com/spreadsheet/ccc?key=' + destination;
            }
        };

        $scope.storeDefault = function () {
            console.log('storeDefault', $scope.data.defaultDoc);
            // Save it using the Chrome extension storage API.
            chrome.storage.sync.set({
                'defaultDoc': $scope.data.defaultDoc
            }, function () {
                // Notify that we saved.
                chrome.storage.sync.get('defaultDoc', function (items) {
                    console.log('storage.sync.get', items);
                });
            });
            //If there is a change to the stored value, updateMeta gets triggered automatically.
        };

    }]);

    //End Closure
})();

//Polyfill
if (!Object.entries)
    Object.entries = function (obj) {
        var ownProps = Object.keys(obj),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array

        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
        return resArray;
    };