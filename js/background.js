var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
var DRIVE_FILES = 'https://www.googleapis.com/drive/v2/files';
var SPREAD_SCOPE = 'https://spreadsheets.google.com/feeds';
var docs = []; //In memory cache for the user's entire doclist.
var row = []; //In memory cache for each row of the sheet returned.
var cat = []; //In memory cache for entire folder list
var refreshRate = localStorage.refreshRate || 300; // 5 min default.
var pollIntervalMin = 1000 * refreshRate;
var pollIntervalMax = 10000 * refreshRate;
var requests = [];
var requestFailureCount = 0
var requestLimit = 3;
var docName; //For passing the document name to the export page.
var docKey;


var FULL_SCOPE = DOCLIST_SCOPE + ' ' + SPREAD_SCOPE + ' ' + DRIVE_SCOPE;

// Array to hold callback functions
var callbacks = [];

var firstRun = true; //Variable that is only true in the first start after an update. //Set to false if there is no need to update the headers.

//defines a common and persistant object for handling the accessToken and other functions. avoids having to invoke angular in the background.
var gdocs = new GDocs();

toggleAuth = function(interactive, callback) {
  console.log('gdocs accessToken', gdocs.accessToken);
  //if (!gdocs.accessToken) {
  gdocs.auth(interactive, function(token) { //was failing to get the refreshed accessToken. Now we just call chrome.auth every time.
    //$scope.fetchFolder(false);
    //$scope.fetchDocs(false);
    callback(token);
  });
  /*} else {
    //gdocs.revokeAuthToken(function() {});
    //this.clearDocs();
    callback();
  }*/
}


/////////////////////////////////////////////////////////
/*chrome.runtime.sendMessage("ID of extension", "message", function(response) {
    var lastError = chrome.runtime.lastError;
    if (lastError) {
        console.log('Caught Runtime Error Msg',lastError.message);
        // 'Could not establish connection. Receiving end does not exist.'
        return;
    }
    // Success, do something with response...
});*/


/////////////////////////////////////////////////////////
// This function is called onload in the popup code
function getPageInfo(callback) {
  chrome.tabs.getSelected(function(tab) {
    console.log('getPageInfo', tab);
    if ((tab.url.indexOf("chrome-devtools://") == -1) &&
      (tab.url.indexOf("chrome://") == -1) &&
      (tab.url.indexOf("chrome-extension://") == -1) &&
      (tab.url.indexOf("file://") == -1)) {
      console.log('execute content scripts');
      // Add the callback to the queue
      callbacks = [];
      callbacks.push(callback);
      // Inject the content script into the current page
      //chrome.tabs.executeScript(null, { file: "content_script.js" });

      chrome.tabs.executeScript(null, {
        file: "js/jquery-1.7.2.min.js"
      }, function() {
        if (chrome.runtime.lastError) {
          console.log('Scripting error:', chrome.runtime.lastError.message);
          error(tab);
        }
        chrome.tabs.executeScript(null, {
          file: "js/content_script.js"
        }, function() {
          if (chrome.runtime.lastError) {
            console.log('Scripting error:', chrome.runtime.lastError.message);
            error(tab);
          }
        });
      });

      //console.log('callbacks',callbacks);
    } else {
      console.log('getPageInfo error');
      error(tab);
    }
  });

  error = function(tab) {
    //If the content script injection fails (ie. we're in devtools or another protected Chrome page) do a generic callback.
    var pageInfo = {
      'Title': tab.title.trim(),
      //'Summary': getClipboard(),
      'Url': tab.url
    };
    callback(pageInfo);
  };
}

chrome.extension.onConnect.addListener(function(port) {
  var tab = port.sender.tab;

  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  port.onMessage.addListener(function(info) {
    console.log('onMessage Listener ', info);
    console.log('tab.url ', tab.url);
    console.log('callbacks', callbacks);
    //var max_length = 1024;
    //if (info.selection.length > max_length)
    //info.selection = info.selection.substring(0, max_length);
    var docKey;
    if (info.values == 0 && info.message == "myCustomEvent") {
      //Need to update functions to grab the doc id from the tab url and put it in the bgpage variables.
      docKey = tab.url.split("=")[1].split('#')[0].split('&')[0];
      console.log('Try printing', docKey);
      _gaq.push(['_trackEvent', 'Button', 'Print From Sheet']);
      //gdocs.printDocument();
      //gdocs.printDocumentPage();

      getDocument('print', docKey, true, function(response) {});
      //callPrintable('print');
    } else if (info.values == 1 && info.message == "myCustomEvent") {
      docKey = tab.url.split("=")[1].split('#')[0].split('&')[0];
      console.log('Try exporting', docKey);
      _gaq.push(['_trackEvent', 'Button', 'Export From Sheet']);
      //gdocs.exportDocument();
      //gdocs.exportDocumentPage();

      getDocument('export', docKey, true, function(response) {});
      //callPrintable('export');
    }

    //Updates the dummy url to the actual url of the tab.
    var pageInfo = {
      'Title': info.title ? info.title.trim() : "",
      'Url': tab.url,
      'Summary': info.summary ? info.summary.trim() : "",
      'Author': info.authorName ? info.authorName.trim() : "",
      'Tags': info.tags ? info.tags.trim() : "",
    };

    var callback = callbacks[0]; //callbacks.shift();
    // Call the callback function
    if (callback) {
      callback(pageInfo);
    }
    //executeMailto(tab.id, info.title, tab.url, info.selection);
  });
});

/////////////////////////////////////////////////////////
//Try to connect with printable.
function callPrintable(action, callback) {
  console.log('callPrintable');
  // The ID of the extension we want to talk to.
  //var printableId = "bdhofmoocbkmplcojaemnjogcmefeido"; //Local, for testing.
  // var printableId = "jihmnnkhocjgfhnffpigaachefmnelfg"; //Live. //Intentionally broken since Printable is broken
  // Make a simple request:
  if (action == "print") {
    _gaq.push(['_trackEvent', 'Button', 'Print Document']);

    chrome.storage.sync.get(null, function(response) {
      chrome.tabs.create({
        'url': 'view.html?key=' + response.defaultDoc.id + '&title=' + response.defaultDoc.title
      });
      if (callback) {
        callback();
      }
    });

  } else if (action == "export") {
    _gaq.push(['_trackEvent', 'Button', 'Export Document']);

    chrome.storage.sync.get(null, function(response) {
      chrome.tabs.create({
        'url': 'export.html?key=' + response.defaultDoc.id + '&title=' + response.defaultDoc.title
      });
      if (callback) {
        callback();
      }
    });
  }
}


processDocContent = function(response, xhr, callback) {
  console.log('rows returned: ', xhr);

  //Clear row cache in bgPage. //TODO: clean this up so as to not leave a copy lying around. Maybe use localStorage?
  var row = [];

  var data = JSON.parse(response);
  console.log('row data: ', data, Boolean(data.feed.entry));
  if (data.feed.entry) {

    for (var i = 0; i < data.feed.entry.length; ++i) {
      var entry = data.feed.entry[i];
      console.log(i);
      row.push(new Row(entry));
    }
    console.log('row: ', row);

    //Uses local storage to pass data to export and print. The only downside is we can only hold one document of data at a time so refreshing the old page gets the new data. TODO: move the request to the export/print page and store the results there. Pass in the info via a url param?

    chrome.storage.local.set({
      'row': row
    }, function(response) {
      chrome.storage.local.get('row', function(response) {
        console.log("chrome.storage.sync.get('row')", response);
      });
    });

    chrome.storage.sync.get('defaultDoc', function(response) {
      console.log("chrome.storage.sync.get('defaultDoc')", response);
      //Keep the rows and defaultDoc info insync by storing in local at the same time.
      chrome.storage.local.set({
        'defaultDoc': response.defaultDoc
      }, function(response) {
        console.log("chrome.storage.local.set({'defaultDoc'", response);
      });
      //docName = response.defaultDoc.title;
    });
    if (callback) {
      callback(true);
    }

  } else {
    console.log('No entries');
    showMsg('Invalid file.', error, 10000);
    if (callback) {
      callback(false);
    }
  }
};

Row = function(entry) {
  this.title = (entry.gsx$title ? entry.gsx$title.$t : '');
  this.url = (entry.gsx$url ? entry.gsx$url.$t : '');
  this.summary = (entry.gsx$summary ? entry.gsx$summary.$t : '');
  this.tags = (entry.gsx$tags ? entry.gsx$tags.$t : '');
  this.author = (entry.gsx$author ? entry.gsx$author.$t : '');
  this.date = (entry.gsx$date ? entry.gsx$date.$t : '');
};

String.prototype.toProperCase = function() {
  return this.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

getDocument = function(param, docId, retry, callback) {

  /*chrome.storage.sync.get('defaultDoc', function(response){
    	console.log("chrome.storage.sync.get('defaultDoc')",response);

  	docId = response.defaultDoc.id;
  });*/
  if (docId == '') {
    return;
  } else {
    console.log('exportDocument');

    var config = {
      params: {
        'alt': 'json'
      },
      headers: {
        'Authorization': 'Bearer ' + gdocs.accessToken,
        'GData-Version': '3.0',
      }
    };

    var worksheetId = 'default';

    var url = SPREAD_SCOPE + '/list/' + docId + '/' + worksheetId + '/private/full?' + Util.stringify(config.params);

    //$scope.data.requesting = true; //Reset the variable.

    handleSuccess = function(response, xhr) {
      console.log('Response', response, 'XHR:', xhr);
      if (xhr.status != 201 && xhr.status != 200) {
        console.log('getDocument ERROR', xhr);
        if (retry == true && xhr.status == 401) {
          //Try toggling the auth and running again.
          toggleAuth(true, function() {
            getDocument(param, docId, false, callback);
          });
        } else {
          if (callback) {
            callback(null);
          }
          return;
        }
      } else {
        processDocContent(response, xhr, function(success) {
          if (success) {
            callPrintable(param, function(response) {
              console.log(response);
              if (callback) {
                callback(response);
              }
            });
          } else {
            if (callback) {
              callback(null);
            }
          }
        });
      }

    };

    gdocs.makeRequest('GET', url, handleSuccess, null, config.headers);

  }
};


/////////////////////////////////////////////////////////
var createDocument = function(data, fileName, parentFolder, callback) {
    return new Promise(function(resolve, reject){
        console.log('createDocument', data, fileName, callback);
        _gaq.push(['_trackEvent', 'Auto', 'Create Document']);
        // JSON to CSV Converter

        //TODO: use "for(var i in o){console.log(i,o[i]);}" to traverse a single object instead of an array of objects. i=key o[1]=value


        var handleSuccess = function(response, xhr) {
            console.log('doc returned: ', response, xhr);

            if (xhr.status != 201 && xhr.status != 200) {
            console.log('ERROR', xhr);
            _gaq.push(['_trackEvent', 'Auto', 'Create Document Error']);
            requestFailureCount++;
            if (requestFailureCount < requestLimit) {
                gdocs.makeRequest('POST', url, handleSuccess, multipartRequestBody, headers);
            } else {
                reject(new Error(xhr.status + ' Please try again.'));
                // if(callback) callback();
            }
            } else {
            //Make the new doc the default doc next time we open citable. Fully background so it won't update live.
            var entry = JSON.parse(response);
            var doc = {
                title: entry.title,
                id: entry.id,
                updatedDate: Util.formatDate(entry.modifiedDate),
                updatedDateFull: entry.modifiedDate,
                icon: entry.iconLink,
                alternateLink: entry.alternateLink,
                size: entry.fileSize ? '( ' + entry.fileSize + ' bytes)' : null
            };

            chrome.storage.sync.set({
                'defaultDoc': doc
            }, function() {
                // Log that we saved.
                chrome.storage.sync.get('defaultDoc', function(items) {
                console.log('storage.sync.get', items);
                });
            });
            requestFailureCount = 0;
            //   if (callback) callback(JSON.parse(response));
                resolve(entry);
            }

            //var resourceId = JSON.parse(response).entry.gd$resourceId.$t;

            //callback(resourceId);

        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        //Alt: 'text/plain';
        var contentType = 'text/csv';

        var parent = {
            //"kind": "drive#parentReference",
            "id": parentFolder.id //,
            //"selfLink": parentFolder.selfLink,
            //"parentLink": parentFolder.parents[0].parentLink,
            //"isRoot": false
        };

        /*var properties = {
            'key': key,
            'value': value,
            'visibility': visibility
        }*/

        var metadata = {
            'title': fileName,
            'mimeType': contentType,
            //'properties': [properties],
            'parents': [parent]
        };

        //Base64 encode the JSON object array
        var base64Data = btoa(Util.JSONToCSV([data]));

        var multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;

        /* 'path': '/upload/drive/v2/files',
        'method': 'POST', */
        var params = {
            'uploadType': 'multipart',
            'convert': 'true'
        };

        //Alt: 'multipart/mixed'
        var headers = {
            'Authorization': 'Bearer ' + gdocs.accessToken,
            'GData-Version': '3.0',
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        };
        //'body': multipartRequestBody});

        //Sends the params to the background page to get delivered to gDocs.
        var url = 'https://www.googleapis.com/upload/drive/v2/files?' + Util.stringify(params);

        //TODO: make this angular and use $http
        //Reference: GDocs.prototype.makeRequest = function(method, url, callback, opt_data, opt_headers)
        gdocs.makeRequest('POST', url, handleSuccess, multipartRequestBody, headers);

        console.log('New File:', url, headers);

    });
};

/////////////////////////////////////////////////////////
var createFolder = function(title, properties, callback) {
  console.log('createFolder ', title);
  _gaq.push(['_trackEvent', 'Auto', 'Create Folder']);

  var handleSuccess = function(response, xhr) {
    console.log('Folder created: ', response, xhr);
    var data = {
      items: [JSON.parse(response)]
    }; //Wrap the response in an object with property items so it looks like the fetchFolder response. Hack.
    callback(data);
  };

  //util.displayMsg('Creating folder...');
  console.log('Creating folder...');

  var headers = {
    'Authorization': 'Bearer ' + gdocs.accessToken,
    'GData-Version': '3.0',
    'Content-Type': 'application/json'
  };

  var parent = {
    "id": "root"
  };

  var metadata = {
    'title': title,
    'mimeType': "application/vnd.google-apps.folder",
    'parents': [parent],
    'properties': properties
  };

  //Sends the params to the background page to get delivered to gDocs.
  var url = 'https://www.googleapis.com/drive/v2/files';

  //TODO: make this angular and use $http
  //Reference: GDocs.prototype.makeRequest = function(method, url, callback, opt_data, opt_headers)
  gdocs.makeRequest('POST', url, handleSuccess, JSON.stringify(metadata), headers);

  console.log('FOLDER:', url, headers);
};

/////////////////////////////////////////////////////////
/* function setIcon(opt_badgeObj) {
	if (opt_badgeObj) {
	  var badgeOpts = {};
	  if (opt_badgeObj && opt_badgeObj.text != undefined) {
		badgeOpts['text'] = opt_badgeObj.text;
	  }
	  if (opt_badgeObj && opt_badgeObj.tabId) {
		badgeOpts['tabId'] = opt_badgeObj.tabId;
	  }
	  chrome.browserAction.setBadgeText(badgeOpts);
	}
};

function clearPendingRequests() {
	for (var i = 0, req; req = requests[i]; ++i) {
	  window.clearTimeout(req);
	}
	requests = [];
};

function logout(access_token, callback) {
	//oauth.clearTokens(); //Old Auth Flow
	clearPendingRequests();
	docs = [];
	setIcon({'text': ''});
};*/

//Function that takes a doc object or an array of doc objects with id property and inserts the specified array of properties.
// updateProperties($scope.data.docs, 'Citable', 'True', 'Public');
var insertProperties = function(docs, properties, callback) {
  console.log('insertProperties ', docs, properties);
  _gaq.push(['_trackEvent', 'Auto', 'Update Properties']); //When this goes to 0 in analytics, stop doing this on install.

  var handleSuccess = function(response, xhr) {
    console.log('Property added: ', response, xhr);

    //If successful, this method returns a Properties resource in the response body.

    if (callback) {
      callback(response);
    }
  };

  var headers = {
    'Authorization': 'Bearer ' + gdocs.accessToken,
    'GData-Version': '3.0',
    'Content-Type': 'application/json'
  };

  /*var properties = [{
        'key': key,
	    'value': value,
	    'visibility': visibility
    }];*/

  var loopProperties = function(id) {
    for (var i in properties) {
      console.log('loopProperties', properties[i]);
      makeRequest(id, headers, properties[i]);
    }
  };

  var makeRequest = function(id, headers, properties) {
    //Sends the params to the background page to get delivered to gDocs.
    var url = 'https://www.googleapis.com/drive/v2/files/' + id + '/properties';

    //Reference: GDocs.prototype.makeRequest = function(method, url, callback, opt_data, opt_headers)
    gdocs.makeRequest('POST', url, handleSuccess, JSON.stringify(properties), headers);

    console.log('INSERT PROPERTIES:', url, headers);
  };

  if (Array.isArray(docs)) {
    console.log('loop through docs');
    for (var i in docs) {
      loopProperties(docs[i].id);
    }
  } else {
    console.log('one doc only');
    loopProperties(docs.id);
  }

};

var renameFolder = function(folder, title, callback) {
  console.log('renameFolder ', folder, title);
  _gaq.push(['_trackEvent', 'Auto', 'Rename Folder']); //When this goes to 0 in analytics, stop doing this on install.

  var id = folder.id;

  var headers = {
    'Authorization': 'Bearer ' + gdocs.accessToken,
    'GData-Version': '3.0',
    'Content-Type': 'application/json'
  };

  var body = {
    'title': title
  };

  var params = {
    'convert': 'false'
  };

  var makeRequest = function(id, headers, properties) {
    //Sends the params to the background page to get delivered to gDocs.
    var url = 'https://www.googleapis.com/drive/v2/files/' + id + '?' + Util.stringify(params);

    //Reference: GDocs.prototype.makeRequest = function(method, url, callback, opt_data, opt_headers)
    gdocs.makeRequest('PUT', url, handleSuccess, JSON.stringify(properties), headers);

    console.log('RENAME FOLDER:', url, headers);
  };

  var handleSuccess = function(response, xhr) {
    console.log('Folder renamed: ', response, xhr);

    //If successful, this method returns a Files resource in the response body.

    if (callback) {
      callback(response);
    }
  };

  makeRequest(id, headers, body);
};


//Updates the document headers in all of the user's spreadsheets found in Citable_Documents.
//Runs completely in the background.
//TODO: Citable successfully posts the note even if only one column (with incoming data) is present. This is ok, if we assume users don't want data if they delete a column, but it's problematic if we want to be fool-proof. Consider doing a forced header-update for all docs on a recurring basis.
var updateDocument = function(callback, docToUpdate) {

  var privateDocs;
  if (docToUpdate != null) {
    _gaq.push(['_trackEvent', 'Auto', 'Update Document', 'Single']);
    privateDocs = [docToUpdate];
  } else {
    _gaq.push(['_trackEvent', 'Auto', 'Update Document', 'Multi', privateDocs.length]);
    //Docs is currently null since it is outside of the scope of angular. Consider revising. Today we have to pass in the complete doc list if we want to update everyting.
    privateDocs = docs; //Copy the doclist into a private variable so that we can run in the background while the user can send notes to the doc of choice.
  }

  console.log('updateDocument ');
  var docId = '';
  //var worksheetId = 'od6';
  var worksheetId = 'default'; //Switch to default to support documents created through the Drive API.
  var order = ['Title', 'Url', 'Date', 'Author', 'Summary', 'Tags']; //'Title,Url,Date,Author,Summary,Tags'
  var Cells = [];
  var Cell = function(entry) {
    this.title = (entry.gs$cell ? entry.gs$cell.$t : '');
    this.col = (entry.gs$cell ? entry.gs$cell.col : '');
    this.row = (entry.gs$cell ? entry.gs$cell.row : '');
  };
  var Sheet = function(entry) {
    this.title = (entry.title ? entry.title.$t : '');
    this.updated = (entry.updated ? entry.updated.$t : '');
    this.content = {};
    this.content.type = "application/atom+xml;type=feed";
    this.content.src = "https://spreadsheets.google.com/feeds/list/" + docId + "/od6/private/full";
    this.rowCount = (entry.gs$rowCount ? entry.gs$rowCount.$t : '');
    this.colCount = (entry.gs$colCount ? entry.gs$colCount.$t : '');
  };
  var colCount;

  var handleSuccess = function(response, xhr) {
    console.log('updateDocument handleSuccess: ', response, xhr);
    if (xhr.status != 200) {
      console.log('ERROR: ', xhr, response);
      //callback(xhr.status); //Return the error to the calling function.
      nextDocument(xhr.status); //If the document is not a spreadsheet for some absurd reason, just skip it. Pass the error to the nextDoc fucntion.
      return; //Exit this instance of the function.
    } else {
      requestFailureCount = 0;
    }

    var data = JSON.parse(xhr.response);
    console.log('JSON data', data);
    Cells = [];
    colCount = parseInt(data.feed.gs$colCount.$t);

    console.log('Cell data. Should have entries. ', data);

    if (data.feed.entry) {

      var sheetEntry = new Sheet(data.feed);
      console.log('sheetEntry: ', sheetEntry);

      console.log('process feed');
      for (var i = 0; i < data.feed.entry.length; ++i) {
        var entry = data.feed.entry[i];
        Cells.push(new Cell(entry));
      }
      var missingTitles = checkTitles();
      var moreCols = missingTitles.length - (colCount - parseInt(Cells[Cells.length - 1].col)); //Columns needed minus, the total number of columns minus the last filled column. The blank columns at the end of the row.

      console.log(missingTitles.length, '-(', colCount, '-', parseInt(Cells[Cells.length - 1].col), ') = moreCols: ', moreCols);

      if (missingTitles.length > 0) {
        if (moreCols > 0) {
          //getWorksheet(moreCols, function(){updateCells(1, parseInt(Cells[Cells.length-1].col)+1, missingTitles)});
          addCols(moreCols, sheetEntry, function() {
            updateCells(1, parseInt(Cells[Cells.length - 1].col) + 1, missingTitles);
          });
        } else {
          updateCells(1, parseInt(Cells[Cells.length - 1].col) + 1, missingTitles);
        }
      } else {
        //All titles found.
        nextDocument();
      }
    } else {
      //No cells with data found.
      updateCells(1, 1, order); //Update everything starting in cell R1C1.
    }
  };

  var checkTitles = function() {
    var cellValues = '';
    var missingTitles = [];
    for (var i = 0; i < Cells.length; i++) {
      //console.log('Cells[',i,'].title: ', Cells[i].title);
      cellValues = cellValues.concat(Cells[i].title);
    }
    var j = 0;
    for (var k = 0; k < order.length; k++) {
      //console.log('Search title "',order[i],'" in "',cellValues,'"');
      if (cellValues.search(order[k]) == -1) {
        missingTitles[j] = order[k];
        j++;
      }
    }
    console.log('missingTitles: ', missingTitles);
    return missingTitles;
  };

  //Generic function to batch update cells in row r starting in column c.
  var updateCells = function(r, c, missingTitle, callback) {
    var handleCellsSuccess = function(response, xhr) {
      console.log('updateDocument addTitles handleSuccess: ', xhr);
      if (xhr.status != 200) {
        console.log('ERROR: ', xhr, response);
        //callback(xhr.status); //Return the error to the calling function.
        return;
      } else {
        requestFailureCount = 0;
      }
      console.log('Finished Updating Titles in Doc ', k);
      nextDocument();
    };
    //gs$colCount': colCount+n

    var headers = {
      //'method': 'POST',
      //'headers': {
      'Authorization': 'Bearer ' + gdocs.accessToken,
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml',
      'If-Match': '*'
      //}//,
      //'body': constructBatchAtomXml_(r,c,missingTitle)

    };
    //var url = SPREAD_SCOPE +'/cells/'+docId+'/'+worksheetId+'/private/full/R'+r+'C'+c; //Url for single cell updates.
    var url = SPREAD_SCOPE + '/cells/' + docId + '/' + worksheetId + '/private/full/batch';
    console.log('AddTitles request', r, c, missingTitle, headers, url);

    gdocs.makeRequest('POST', url, handleCellsSuccess, constructBatchAtomXml_(r, c, missingTitle), headers);
  };

  //For batch cell updates.
  constructBatchCellAtomXml_ = function(r, c, content) {
    var atom = ['<entry>',
      '<batch:id>R', r, 'C', c, '</batch:id>',
      '<batch:operation type="update"/>',
      '<id>https://spreadsheets.google.com/feeds/cells/', docId, '/', worksheetId, '/private/full/R', r, 'C', c, '</id>',
      '<link rel="edit" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/cells/', docId, '/', worksheetId, '/private/full/R', r, 'C', c, '"/>',
      '<gs:cell row="', r, '" col="', c, '" inputValue="', content, '"/>',
      '</entry>',
    ].join('');
    return atom;
  };

  contructBatchCellEntries_ = function(r, c, missingTitles) {
    var batch = '';
    for (var i = 0; i < missingTitles.length; i++) {
      batch += constructBatchCellAtomXml_(r, c + i, missingTitles[i]);
    }
    return batch;
  };

  constructBatchAtomXml_ = function(r, c, missingTitles) {
    var atom = ['<feed xmlns="http://www.w3.org/2005/Atom" xmlns:batch="http://schemas.google.com/gdata/batch" xmlns:gs="http://schemas.google.com/spreadsheets/2006" >',
      '<id>https://spreadsheets.google.com/feeds/cells/', docId, '/', worksheetId, '/private/full</id>',
      contructBatchCellEntries_(r, c, missingTitles),
      '</feed>',
    ].join('');
    return atom.trim().replace("^([\\W]+)<", "<"); //There are evidently bad characters in the XML that this regex removes.
  };

  var addCols = function(n, sheetEntry, callback) {

    var handleColsSuccess = function(response, xhr) {
      console.log('updateDocument addCols handleSuccess: ', xhr);
      if (xhr.status != 200) {
        console.log('ERROR: ', xhr, response);
        //callback(xhr.status); //Return the error to the calling function.
        return;
      } else {
        requestFailureCount = 0;
      }
      if (callback) {
        callback();
      }
    };

    var headers = {
      //'method': 'PUT',
      //'headers': {
      'Authorization': 'Bearer ' + gdocs.accessToken,
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml',
      'If-Match': '*'
      //}//,
      //'body': constructColAtomXml_(parseInt(colCount)+n,sheetEntry)

    };
    var url = SPREAD_SCOPE + '/worksheets/' + docId + '/private/full/' + worksheetId;
    console.log('AddCols request', n, headers, url);
    gdocs.makeRequest('PUT', url, handleColsSuccess, constructColAtomXml_(parseInt(colCount) + n, sheetEntry), headers);
  };

  constructColAtomXml_ = function(n, sheetEntry) {
    var atom = ["<?xml version='1.0' encoding='UTF-8'?>", '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006"><id>https://spreadsheets.google.com/feeds/worksheets/', docId, '/private/full/', worksheetId, '</id>',
      ' <updated>', sheetEntry.updated, '</updated>',
      '<category scheme="http://schemas.google.com/spreadsheets/2006" term="http://schemas.google.com/spreadsheets/2006#worksheet"/>',
      '<title type="text">', sheetEntry.title, '</title>',
      '<content type="', sheetEntry.content.type, '" src="', sheetEntry.content.src, '"/>',
      '<link rel="http://schemas.google.com/spreadsheets/2006#listfeed" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/list/', docId, '/', worksheetId, '/private/full"/>',
      '<link rel="http://schemas.google.com/spreadsheets/2006#cellsfeed" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/cells/', docId, '/', worksheetId, '/private/full"/>',
      '<link rel="self" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/worksheets/', docId, '/private/full/', worksheetId, '"/>',
      '<link rel="edit" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/worksheets/', docId, '/private/full/', worksheetId, '"/>',
      '<gs:rowCount>', sheetEntry.rowCount, '</gs:rowCount>',
      '<gs:colCount>', n, '</gs:colCount>',
      '</entry>'
    ].join('');
    return atom.trim().replace("^([\\W]+)<", "<"); //There are evidently bad characters in the XML that this regex removes.
  };

  //Decriment through the privateDocs array and update each one.
  var nextDocument = function(hasError) {
    console.log(privateDocs.length);
    if (privateDocs.length != 0 && k > -1) {
      docId = privateDocs[k].id;

      console.log('Bearer ' + gdocs.accessToken);

      var headers = {
        //'headers': {
        'Authorization': 'Bearer ' + gdocs.accessToken,
        'GData-Version': '3.0',
        'content-type': 'application/json'
        //}
      };
      var params = {
        //'params': {
        'alt': 'json',
        'min-row': '1',
        'max-row': '1',
        'min-col': '1'
        //}
      };
      //var parameters = JSON.stringify(params);

      //GET https://spreadsheets.google.com/feeds/cells/key/worksheetId/private/full?min-row=1&max-row=1&min-col=1&alt=json
      var url = SPREAD_SCOPE + '/cells/' + docId + '/' + worksheetId + '/private/full?' + Util.stringify(params);

      //TODO: make this angular and use $http
      //Reference: GDocs.prototype.makeRequest = function(method, url, callback, opt_data, opt_headers)
      gdocs.makeRequest('GET', url, handleSuccess, null, headers);

      k--; //Step backward throug the doclist.

    } else {
      //End of updateDocument.
      if (callback) callback(hasError);
    }
  };
  //Intitialize k to privateDocs.length-1 for the doc list.
  //We work backwards through the list to prevent inverting the users doclist.
  var k = privateDocs.length - 1;
  nextDocument(); //Start the process.
};

//Callback for calling updateDocuments on first run from background page.
var updateDocumentCallback = function() {
  console.log('Successfully completed spreadsheets header update.');
  firstRun = false;
};
