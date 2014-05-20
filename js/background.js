
      var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
      var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
      var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
      var SPREAD_SCOPE = 'https://spreadsheets.google.com/feeds';
      var docs = []; //In memory cache for the user's entire doclist.
      var row = []; //In memory cache for each row of the sheet returned.
      var cat = []; //In memory cache for entire folder list
      var refreshRate = localStorage.refreshRate || 300; // 5 min default.
      var pollIntervalMin = 1000 * refreshRate;
      var requests = [];
      var docName; //For passing the document name to the export page.
      var docKey;
            
      
      var FULL_SCOPE = DOCLIST_SCOPE + ' ' + SPREAD_SCOPE + ' ' + DRIVE_SCOPE;
      
      // Array to hold callback functions
      var callbacks = []; 
      
      var firstRun = true; //Variable that is only true in the first start after an update. //Set to false if there is no need to update the headers.
    
      //Initializes the oauth object. Parameters are defined in chrome_ex_oauth.js. Important for the getToken stream.
      var oauth = ChromeExOAuth.initBackgroundPage({
        'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
        'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
        'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
        //'consumer_key': 'anonymous',
        //'consumer_secret': 'anonymous',
        'consumer_key': '1034066493115.apps.googleusercontent.com',
        'consumer_secret': 'ZYDYGWh1g71m2-w1iA0-VxSC',
		//'scope': 'https://docs.google.com/feeds/',
        'scope': FULL_SCOPE,
        'app_name': 'Citable'
      });
      

/////////////////////////////////////////////////////////
 // This function is called onload in the popup code
    function getPageInfo(callback) 
    { 
        console.log('getPageInfo');
        // Add the callback to the queue
        callbacks = [];
        callbacks.push(callback); 
        // Inject the content script into the current page        
		//chrome.tabs.executeScript(null, { file: "content_script.js" }); 
		chrome.tabs.executeScript(null, { file: "jquery-1.7.2.min.js" }, function() {
    		chrome.tabs.executeScript(null, { file: "content_script.js" });
		});
		//console.log('callbacks',callbacks);
    }; 
    
    chrome.extension.onConnect.addListener(function(port) {
	  var tab = port.sender.tab;
	
	  // This will get called by the content script we execute in
	  // the tab as a result of the user pressing the browser action.
	  port.onMessage.addListener(function(info) {
		console.log('onMessage Listener ', info);
		console.log('tab.url ', tab.url);
		console.log('callbacks',callbacks);
		//var max_length = 1024;
		//if (info.selection.length > max_length)
		  //info.selection = info.selection.substring(0, max_length);

		//Updates the dummy url to the actual url of the tab.
		  var pageInfo = {
		  	'title' : info.title,
		  	'url' : tab.url,
		  	'note' : info.summary,
		  	'authorName' : info.authorName
		  	};

		  var callback = callbacks[0];//callbacks.shift();
        // Call the callback function
        callback(pageInfo); 
		  //executeMailto(tab.id, info.title, tab.url, info.selection);
	  });
	});
    
/*    
/////////////////////////////////////////////////////////
function printDocumentPage(callback) 
{
	//Try...Catch is not actually being used here.
	try { callPrintable("print"); }
	catch(err){ 
		console.log(err);
		chrome.tabs.create({ 'url' : 'view.html'}); 
	}
	callback();
}
/////////////////////////////////////////////////////////
function exportDocument(callback) 
{
	//Try...Catch is not actually being used here.
	try { callPrintable("export"); }
	catch(err){ 
		console.log(err);
		chrome.tabs.create({ 'url' : 'export.html'}); 
	}
	callback();
}
/////////////////////////////////////////////////////////
//Try to connect with printable.
function callPrintable(action){
	console.log('callPrintable');
	// The ID of the extension we want to talk to.
	//var printableId = "bdhofmoocbkmplcojaemnjogcmefeido"; //Local, for testing.
	var printableId = "jihmnnkhocjgfhnffpigaachefmnelfg"; //Live.
	// Make a simple request:
	if(action == "print") {
		chrome.extension.sendRequest(printableId, {printDoc: true, key: docKey, name: docName}, function(response) {
			console.log('response ',response);
			if(response == undefined){
				chrome.tabs.create({ 'url' : 'view.html'});
			}
		});
	} else if(action == "export") {
		chrome.extension.sendRequest(printableId, {exportDoc: true, key: docKey, name: docName}, function(response) {
			console.log('response ',response);
			if(response == undefined){
				chrome.tabs.create({ 'url' : 'export.html'});
			}
		});
	}
}

/////////////////////////////////////////////////////////
function setIcon(opt_badgeObj) {
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
};

//Updates the document headers in all of the user's spreadsheets found in Citable_Documents.
//Runs completely in the background.
updateDocument = function(callback, docToUpdate) {
	var privateDocs;
	if (docToUpdate != null) {
		privateDocs = docToUpdate;
	}
	else { 
		privateDocs = docs; //Copy the doclist into a private variable so that we can run in the background while the user can send notes to the doc of choice.
	}
	console.log('updateDocument ');
	var parts = [];
	var worksheetId = 'od6';
	var order = ['Title','Url','Date','Author','Summary','Tags']; //'Title,Url,Date,Author,Summary,Tags'
	var Cells = [];
	var Cell = function(entry){
		  this.title = (entry.gs$cell ? entry.gs$cell.$t : '');
		  this.col = (entry.gs$cell ? entry.gs$cell.col : '');
		  this.row = (entry.gs$cell ? entry.gs$cell.row : '');
	}
	var Sheet = function(entry){
		  this.title = (entry.title ? entry.title.$t : '');
		  this.updated = (entry.updated ? entry.updated.$t : '');
		  this.content = {};
		  this.content.type = "application/atom+xml;type=feed";
		  this.content.src = "https://spreadsheets.google.com/feeds/list/",parts[1],"/od6/private/full";
		  this.rowCount = (entry.gs$rowCount ? entry.gs$rowCount.$t : '');
		  this.colCount = (entry.gs$colCount ? entry.gs$colCount.$t : '');
	}
	var colCount;
	
	var handleSuccess = function(response, xhr){
		console.log('updateDocument handleSuccess: ',xhr);
		if (xhr.status != 200) {
			console.log('ERROR: ',xhr, response);
			//callback(xhr.status); //Return the error to the calling function.
			nextDocument(); //If the document is not a spreadsheet for some absurd reason, just skip it.
			return; //Exit this instance of the function.
		} else {
			requestFailureCount = 0;
		}
		
		var data = JSON.parse(response);
		Cells = [];
		colCount = parseInt(data.feed.gs$colCount.$t);
		
		console.log('Cell data. Should have entries. ', data);
		
		if(data.feed.entry) {
			
			var sheetEntry = new Sheet(data.feed);
			console.log('sheetEntry: ',sheetEntry);
		
			console.log('process feed');
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				Cells.push(new Cell(entry));
			}
			var missingTitles = checkTitles();
			var moreCols = missingTitles.length - (colCount - parseInt(Cells[Cells.length-1].col) ); //Columns needed minus, the total number of columns minus the last filled column. The blank columns at the end of the row.
		
			console.log(missingTitles.length,'-(',colCount,'-', parseInt(Cells[Cells.length-1].col),') = moreCols: ',moreCols);
		
			if(missingTitles.length>0){
				if(moreCols > 0){
					//getWorksheet(moreCols, function(){updateCells(1, parseInt(Cells[Cells.length-1].col)+1, missingTitles)});
					addCols(moreCols, sheetEntry, function(){updateCells(1, parseInt(Cells[Cells.length-1].col)+1, missingTitles)});
				} else {
					updateCells(1, parseInt(Cells[Cells.length-1].col)+1, missingTitles);
				}
			} else {
				//All titles found.
				nextDocument();
			}
		} else {
			//No cells with data found.
			updateCells(1, 1, order); //Update everything starting in cell R1C1.
		}
	}
	
	var checkTitles = function(){
		var cellValues = '';
		var missingTitles = [];
		for( var i=0; i<Cells.length; i++){
			//console.log('Cells[',i,'].title: ', Cells[i].title);
			cellValues = cellValues.concat(Cells[i].title);
		}
		var j=0;
		for( var i=0; i<order.length; i++){
			//console.log('Search title "',order[i],'" in "',cellValues,'"');
			if(cellValues.search(order[i])==-1){
				missingTitles[j] = order[i];
				j++;
			}
		}
		console.log('missingTitles: ',missingTitles);
		return missingTitles;
	}
	
	//Generic function to batch update cells in row r starting in column c.
	var updateCells = function(r,c,missingTitle,callback){
		var handleCellsSuccess = function(response, xhr){
			console.log('updateDocument addTitles handleSuccess: ',xhr);
			if (xhr.status != 200) {
				console.log('ERROR: ',xhr, response);
				//callback(xhr.status); //Return the error to the calling function.
				return;
			} else {
				requestFailureCount = 0;
			}
			console.log('Finished Updating Titles in Doc ',k);
			nextDocument();
		}
		//gs$colCount': colCount+n 

		var params = {
			'method': 'POST',
			'headers': {
			  'GData-Version': '3.0',
			  'Content-Type': 'application/atom+xml',
			  'If-Match': '*'
			},
		   'body': constructBatchAtomXml_(r,c,missingTitle)
		   
		};
		//var url = SPREAD_SCOPE +'/cells/'+parts[1]+'/'+worksheetId+'/private/full/R'+r+'C'+c; //Url for single cell updates.
		var url = SPREAD_SCOPE +'/cells/'+parts[1]+'/'+worksheetId+'/private/full/batch'; 
		console.log('AddTitles request',r,c,missingTitle,params,url);

		oauth.sendSignedRequest(url, handleCellsSuccess, params);
	};
	
	//For batch cell updates.
	constructBatchCellAtomXml_ = function(r,c,content) {
	  var atom = ['<entry>',
	  '<batch:id>R',r,'C',c,'</batch:id>',
      '<batch:operation type="update"/>',
	  '<id>https://spreadsheets.google.com/feeds/cells/',parts[1],'/',worksheetId,'/private/full/R',r,'C',c,'</id>',
	  '<link rel="edit" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/cells/',parts[1],'/',worksheetId,'/private/full/R',r,'C',c,'"/>',
	  '<gs:cell row="',r,'" col="',c,'" inputValue="',content,'"/>',
	  '</entry>',].join('');
	  return atom;
	};
	
	contructBatchCellEntries_ = function(r,c,missingTitles){
  	  	var batch = '';
  	  	for( var i=0; i<missingTitles.length; i++){
  	  		batch += constructBatchCellAtomXml_(r,c+i,missingTitles[i]);
  	  	}
  	  	return batch;
  	  };
	
	constructBatchAtomXml_ = function(r,c,missingTitles) {
	  var atom = ['<feed xmlns="http://www.w3.org/2005/Atom" xmlns:batch="http://schemas.google.com/gdata/batch" xmlns:gs="http://schemas.google.com/spreadsheets/2006" >',
  	  '<id>https://spreadsheets.google.com/feeds/cells/',parts[1],'/',worksheetId,'/private/full</id>',
  	  contructBatchCellEntries_(r,c,missingTitles),
  	  '</feed>',
  	  ].join('');
	  return atom;
	};

	var addCols = function(n, sheetEntry, callback){
		
		var handleColsSuccess = function(response, xhr){
			console.log('updateDocument addCols handleSuccess: ',xhr);
			if (xhr.status != 200) {
				console.log('ERROR: ',xhr, response);
				//callback(xhr.status); //Return the error to the calling function.
				return;
			} else {
				requestFailureCount = 0;
			}
			if(callback){callback()};
		}

		var params = {
			'method': 'PUT',
			'headers': {
			  'GData-Version': '3.0',
			  'Content-Type': 'application/atom+xml',
			  'If-Match': '*'
			},
		   'body': constructColAtomXml_(parseInt(colCount)+n,sheetEntry)
		   
		};
		var url = SPREAD_SCOPE +'/worksheets/'+parts[1]+'/private/full/'+worksheetId;
		console.log('AddCols request',n,params,url);
		oauth.sendSignedRequest(url, handleColsSuccess, params);
	};
	
	constructColAtomXml_ = function(n,sheetEntry) {
	  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",'<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006"><id>https://spreadsheets.google.com/feeds/worksheets/',parts[1],'/private/full/',worksheetId,'</id>',
				  ' <updated>',sheetEntry.updated,'</updated>',
				  '<category scheme="http://schemas.google.com/spreadsheets/2006" term="http://schemas.google.com/spreadsheets/2006#worksheet"/>',
				  '<title type="text">',sheetEntry.title,'</title>',
				  '<content type="',sheetEntry.content.type,'" src="',sheetEntry.content.src,'"/>',
				  '<link rel="http://schemas.google.com/spreadsheets/2006#listfeed" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/list/',parts[1],'/',worksheetId,'/private/full"/>',
				  '<link rel="http://schemas.google.com/spreadsheets/2006#cellsfeed" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/cells/',parts[1],'/',worksheetId,'/private/full"/>',
				  '<link rel="self" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/worksheets/',parts[1],'/private/full/',worksheetId,'"/>',
				  '<link rel="edit" type="application/atom+xml" href="https://spreadsheets.google.com/feeds/worksheets/',parts[1],'/private/full/',worksheetId,'"/>',
				  '<gs:rowCount>',sheetEntry.rowCount,'</gs:rowCount>',
				  '<gs:colCount>',n,'</gs:colCount>',
				'</entry>'].join('');
	  return atom;
	};
		
	//Decriment through the privateDocs array and update each one.
	var nextDocument = function(){
		if(privateDocs.length != 0 && k>-1){
			parts = privateDocs[k].resourceId.split(':');
			//GET https://spreadsheets.google.com/feeds/cells/key/worksheetId/private/full?min-row=2&min-col=4&max-col=4
			var url = SPREAD_SCOPE +'/cells/'+parts[1]+'/'+worksheetId+'/private/full';
			
			var params = {
				'method': 'GET',
				'headers': {
				  'GData-Version': '3.0'
				},
			   'parameters': {
				  'alt': 'json',
				  'min-row': '1',
				  'max-row': '1',
				  'min-col': '1',
				}
			};
			oauth.sendSignedRequest(url, handleSuccess, params);
			
			k--; //Step backward throug the doclist.
			
		} else {
			//End of updateDocument.
			if(callback){ callback() };
		}
    }
    //Intitialize k to privateDocs.length-1 for the doc list.
    //We work backwards through the list to prevent inverting the users doclist.
	var k = privateDocs.length-1; 
    nextDocument(); //Start the process.
};

var updateDocumentCallback = function() {
	console.log('Successfully completed spreadsheets header update.');
	firstRun = false; 
}
*/
    