//TODO: Add quote field.
//TODO: Migrate the whole system to store only the resourceId and not split(':') every time.

/////////////////////////////////////////////////////////////////////////
//Previously an inline script in popup.html
//Does it still work?

var pageURL;
    	
		function onPrintPage(o)
		{
			//Code executed on callback.
			gdocs.closeWindow();
		}
	    // This callback function is called when the content script has been 
	    // injected and returned its results
	    function onPageInfo(o) 
	    { 
	        if(o){
				console.log('onPageInfo callback', o);
				document.getElementById("title").value = o.title ? o.title : ''; 
				document.getElementById("author").value = o.authorName ? o.authorName: '';
				document.getElementById("url").value = o.url ? o.url: '';
				document.getElementById("summary").innerText = o.summary ? o.summary : ''; 
	        }
	    } 
/////////////////////////////////////////////////////////////////////////
//Replaces onClick="" in popup.html 	    
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#addNote').addEventListener('click', addNoteHandler);
  document.querySelector('#viewDoc').addEventListener('click', viewDocHandler);
  document.querySelector('#printDoc').addEventListener('click', printDocHandler);
  document.querySelector('#exportDoc').addEventListener('click', exportDocHandler);
  document.querySelector('#menu').addEventListener('click', menuHandler);
});

function addNoteHandler(e) {
	gdocs.amendDoc($('#destination').val(),function(){gdocs.closeWindow()});
	return false;
}

function viewDocHandler(e){
	gdocs.viewDoc($('#destination').val());
	return false;
}

function printDocHandler(e){
	gdocs.printDocument($('#destination').val());
	return false;
}

function exportDocHandler(e){
	gdocs.exportDocument($('#destination').val());
	return false;
}

function onChangeHandler(e){
	gdocs.changeAction(this.form,this.value,$('select option:selected').html());
}

function menuHandler(e){
	toggleMenu();
	return false;
}
/////////////////////////////////////////////////////////////////////////

//noop for performance?
//console.log=function(){};

// Protected namespaces.
var util = {};
var gdocs = {};

var bgPage = chrome.extension.getBackgroundPage();
var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
var requestFailureCount = 0;  // used for exponential backoff
var requestTimeout = 1000 * 2;  // 5 seconds

var order = ['summary','title','author','url','tags','destination','doc_title','addNote']; //the tab order for select fields

var folders = ['Citable_Documents','Citation_Tool_Documents'];

//fades the print button
$("#print").mouseover(function() {
$(this).fadeTo(0,1);
}).mouseout(function(){
$(this).fadeTo(0,0.55);
});

var DEFAULT_MIMETYPES = {
  'atom': 'application/atom+xml',
  'document': 'text/plain',
  'spreadsheet': 'text/csv',
  'presentation': 'text/plain',
  'pdf': 'application/pdf'
};

var original_onclick;
var original_index;
function toggleMenu() {
	//$('.note').slideToggle(200);
	console.log($('.note').css("opacity"));
	if($('.note').css("opacity") < 1){ 
		$('.note').fadeTo(200,1);
		$('.input').prop('disabled', false);
		console.log(original_onclick);
		$('#addNote').attr('onclick',original_onclick);
		$('#addNote').attr('tabindex',original_index);
		$('#addNote').removeClass('button_disabled');
		$("#destination option[value='new']").attr("disabled",false);
	} else { 
		$('.note').fadeTo(200,.25); 
		$('.input').prop('disabled', true);
		original_onclick = $('#addNote').attr('onclick');
		original_index = $('#addNote').attr('tabindex');
		$('#addNote').removeAttr('onclick');
		$('#addNote').removeAttr('tabindex');
		$('#addNote').addClass('button_disabled');
		$("#destination option[value='new']").attr("disabled","disabled");
	}
	$('.menu').slideToggle(200);	
	switchFocus('destination'); //Focus on the destination field.
}


/*****************
Shows the title form if the selector is on new.
*******************/
var original_menu;
gdocs.changeAction = function(aForm, aValue, aLabel){
console.log('gdocs.changeAction');
	if(aValue == 'new'){
		$('#new_doc_container').fadeIn(200);
		switchFocus('doc_title');
		//$('#controlBar').hide(); 
		//$('.controls').hide(); 
		$('.controls').fadeTo(200,.25); 
		original_menu = $('#menu').attr('onclick');
		$('#menu').removeAttr('onclick');
		$('#menu').addClass('disabled');
		$('.action').addClass('disabled');
		$('.controls').attr('disabled');
		//$('#selection').addClass('indent');
		//$('#selection').removeClass('space');
	} else {
		$('#new_doc_container').fadeOut(200);
		//$('#controlBar').show();
		//$('.controls').show();
		$('.controls').fadeTo(200,1);
		$('#menu').attr('onclick',original_menu);
		$('#menu').removeClass('disabled');
		$('.action').removeClass('disabled');
		$('.controls').prop('disabled', false);
		//$('#selection').removeClass('indent');
		//$('#selection').addClass('space');
		
		//Update the defaultDoc.
		var parts = $('#destination').val().split(':');
		localStorage['defaultDoc'] = parts[1]; 
		localStorage['defaultDocName'] = aLabel; 
	}
	
	return;
}

//an event listener to submit the form if ctrl+enter or alt+enter are pressed
var myCustomKey = 13; // return/enter
document.documentElement.addEventListener('keydown', keyboardNavigation, false); 

function keyboardNavigation(e) {
	console.log("Key event: ",e.which);

	var active = document.activeElement;
	var i = jQuery.inArray(active.id, order);
	
		  switch(e.which) { 
			 case myCustomKey: 
				if (e.ctrlKey) { //Clears all fields on complete.
					console.log("CTRL+RETURN pressed");
					gdocs.amendDoc($('#destination').val(),function(){clearFields(true)}); 
				}
				if (e.altKey) { //Maintains the url and page title.
					console.log("ALT+RETURN pressed");
					gdocs.amendDoc($('#destination').val(),function(){clearFields(false)});
				}
				if(e.shiftKey){
					return 13;
				}
				if (active.id == 'addNote') {
					gdocs.amendDoc($('#destination').val(),function(){gdocs.closeWindow()});
				}
				console.log("destination value: ", $('#destination').val() == 'new' );
				console.log("doc_title visible? ", $('#new_doc_container').is(":visible"));
				if(active.id == 'destination'){
					if($('#new_doc_container').is(":visible") || $('#destination').val() == 'new'){
						//console.log("Visible!", $('#new_doc_container').is(":visible"));
						switchFocus(order[i+1]);
					} else {
						//console.log("Hidden!", $('#new_doc_container').is(":visible"));
						switchFocus(order[i+2]);
					}
				} 
				else if ( i >= 0 && i < order.length-1) { //TODO: Make sure the active.id was found in the tab order array.
					switchFocus(order[i+1]);
				}
			break; 
		  } 
}

//Closes the popup window.
gdocs.closeWindow = function() {
	console.log('gdocs.closeWindow');
	window.close();
}

//Clears form fields.
function clearFields(clearAllFields) {
console.log('clearFields ', clearAllFields);
	document.getElementById("tags").value = ''; 
	document.getElementById("summary").value = '';
	if(clearAllFields == true){
		document.getElementById("title").value = ''; 
		document.getElementById("url").value = '';
		document.getElementById("author").value = '';
	}
	switchFocus(order[0]);
}

//Sets the tab order based on the array of IDs passed into function.
function setTabOrder(order){
	console.log('Set tab order');
	var len=order.length;
	for(var i=0; i<len; i++) {
		var field = order[i];
		document.getElementById(field).tabIndex=i+1;
	}
}

//Switches focus to the fieldId passed in.
function switchFocus(nextFieldId){
	console.log('Shift focus to ',nextFieldId);
	document.getElementById(nextFieldId).focus();
}

// Persistent click handler for star icons.
$('#doc_type').change(function() {
  if ($(this).val() === 'presentation') {
    $('#doc_content').attr('disabled', 'true')
                     .attr('placeholder', 'N/A for presentations');
  } else {
    $('#doc_content').removeAttr('disabled')
                     .attr('placeholder', 'Enter document content');
  }
});

// Persistent click handler for changing the title of a document.
$('[contenteditable="true"]').live('blur', function(index) {
  var index = $(this).parent().parent().attr('data-index');
  // Only make the XHR if the user chose a new title.
  if ($(this).text() != bgPage.docs[index].title) {
    bgPage.docs[index].title = $(this).text();
    gdocs.updateDoc(bgPage.docs[index]);
  }
});

// Persistent click handler for changing the title of a document.
$('[texteditable="true"]').live('blur', function(index) {
  var index = $(this).parent().parent().attr('data-index');
  // Only make the XHR if the user chose a new title.
  if ($(this).text() != bgPage.docs[index].title) {
    bgPage.docs[index].title = $(this).text();
    gdocs.updateDoc(bgPage.docs[index]);
  }
});

// Persistent click handler for star icons.
$('.star').live('click', function() {
  $(this).toggleClass('selected');

  var index = $(this).parent().attr('data-index');
  bgPage.docs[index].starred = $(this).hasClass('selected');
  gdocs.updateDoc(bgPage.docs[index]);
});

String.prototype.truncate = function(){
    var re = this.match(/^.{0,22}[\S]*/);
    var l = re[0].length;
    var re = re[0].replace(/\s$/,'');
    if(l < this.length)
        re = re + "&hellip;";
	else re = this.substr(0,22)+(this.length>23?"&hellip;":'');
    return re;
}

/*
 * Class to compartmentalize properties of a Google document.
 * @param {Object} entry A JSON representation of a DocList atom entry.
 * @constructor
 */
gdocs.GoogleDoc = function(entry) {
  this.entry = entry;
  this.title = entry.title.$t;
  this.resourceId = entry.gd$resourceId.$t;
  this.type = gdocs.getCategory(
    entry.category, 'http://schemas.google.com/g/2005#kind');
  this.starred = gdocs.getCategory(
    entry.category, 'http://schemas.google.com/g/2005/labels',
    'http://schemas.google.com/g/2005/labels#starred') ? true : false;
  this.link = {
    'alternate': gdocs.getLink(entry.link, 'alternate').href
  };
  this.contentSrc = entry.content.src;
};

//Row prototype object. 
//Added conditinals to all of the elements to prevent failure if a user deletes a header from the spreadsheet.
gdocs.Row = function(entry) {
  this.title = (entry.gsx$title ? entry.gsx$title.$t : '');
  this.url = (entry.gsx$url ? entry.gsx$url.$t : '');
  this.summary = (entry.gsx$summary ? entry.gsx$summary.$t : '');
  this.tags = (entry.gsx$tags ? entry.gsx$tags.$t : '');
  this.author = (entry.gsx$author ? entry.gsx$author.$t : '');
  this.date = (entry.gsx$date ? entry.gsx$date.$t : '');
};

gdocs.Category = function(entry) {
  this.entry = entry;
  this.resourceId = entry.gd$resourceId.$t;
};


/**
 * Sets up a future poll for the user's document list.
 */
util.scheduleRequest = function() {
  var exponent = Math.pow(2, requestFailureCount);
  var delay = Math.min(bgPage.pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  if (bgPage.oauth.hasToken()) {
    var req = bgPage.window.setTimeout(function() {
      gdocs.getDocumentList(); //Get the first folder, no callback.
      util.scheduleRequest();
    }, delay);
    bgPage.requests.push(req);
  }
};

/**
 * Urlencodes a JSON object of key/value query parameters.
 * @param {Object} parameters Key value pairs representing URL parameters.
 * @return {string} query parameters concatenated together.
 */
util.stringify = function(parameters) {
  var params = [];
  for(var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
};

/**
 * Creates a JSON object of key/value pairs
 * @param {string} paramStr A string of Url query parmeters.
 *    For example: max-results=5&startindex=2&showfolders=true
 * @return {Object} The query parameters as key/value pairs.
 */
util.unstringify = function(paramStr) {
  var parts = paramStr.split('&');

  var params = {};
  for (var i = 0, pair; pair = parts[i]; ++i) {
    var param = pair.split('=');
    params[decodeURIComponent(param[0])] = decodeURIComponent(param[1]);
  }
  return params;
};

/**
 * Utility for displaying a message to the user.
 * @param {string} msg The message.
 */
util.displayMsg = function(msg) {
  $('#butter').removeClass('error').text(msg).show();
};

/**
 * Utility for removing any messages currently showing to the user.
 */
util.hideMsg = function() {
  $('#butter').fadeOut(1500);
};

/**
 * Utility for displaying an error to the user.
 * @param {string} msg The message.
 */
util.displayError = function(msg) {
  util.displayMsg(msg);
  $('#butter').addClass('error');
};

/**
 * A generic error handler for failed XHR requests.
 * @param {XMLHttpRequest} xhr The xhr request that failed.
 * @param {string} textStatus The server's returned status.
 */
gdocs.handleError = function(xhr, textStatus) {
  //util.hideMsg();
  if(xhr.status != 0){
  	util.displayError(xhr.status, ' ', xhr.statusText);
  } else {
  	util.displayError("No internet connection.");
  }
  ++requestFailureCount;
};

/**
 * Returns the correct atom link corresponding to the 'rel' value passed in.
 * @param {Array<Object>} links A list of atom link objects.
 * @param {string} rel The rel value of the link to return. For example: 'next'.
 * @return {string|null} The appropriate link for the 'rel' passed in, or null
 *     if one is not found.
 */
gdocs.getLink = function(links, rel) {
  for (var i = 0, link; link = links[i]; ++i) {
    if (link.rel === rel) {
      return link;
    }
  }
  return null;
};

/**
 * Returns the correct atom category corresponding to the scheme/term passed in.
 * @param {Array<Object>} categories A list of atom category objects.
 * @param {string} scheme The category's scheme to look up.
 * @param {opt_term?} An optional term value for the category to look up.
 * @return {string|null} The appropriate category, or null if one is not found.
 */
gdocs.getCategory = function(categories, scheme, opt_term) {
  for (var i = 0, cat; cat = categories[i]; ++i) {
    if (opt_term) {
      if (cat.scheme === scheme && opt_term === cat.term) {
        return cat;
      }
    } else if (cat.scheme === scheme) {
      return cat;
    }
  }
  return null;
};



/**
 * A helper for constructing the raw Atom xml send in the body of an HTTP post.
 * @param {XMLHttpRequest} xhr The xhr request that failed.
 * @param {string} docTitle A title for the document.
 * @param {string} docType The type of document to create.
 *     (eg. 'document', 'spreadsheet', etc.)
 * @param {boolean?} opt_starred Whether the document should be starred.
 * @return {string} The Atom xml as a string.
 */
gdocs.constructAtomXml_ = function(docTitle, docType, opt_starred) {
  var starred = opt_starred || null;

  var starCat = ['<category scheme="http://schemas.google.com/g/2005/labels" ',
                 'term="http://schemas.google.com/g/2005/labels#starred" ',
                 'label="starred"/>'].join('');

				//if starred then starCat else ''
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>", 
              '<entry xmlns="http://www.w3.org/2005/Atom">',
              '<category scheme="http://schemas.google.com/g/2005#kind"', 
              ' term="http://schemas.google.com/docs/2007#', docType, '"/>',
              starred ? starCat : '', 
              '<title>', docTitle, '</title>',
              '</entry>'].join('');
  return atom;
};

/**
 * A helper for constructing the body of a mime-mutlipart HTTP request.
 * @param {string} title A title for the new document.
 * @param {string} docType The type of document to create.
 *     (eg. 'document', 'spreadsheet', etc.)
 * @param {string} body The body of the HTTP request.
 * @param {string} contentType The Content-Type of the (non-Atom) portion of the
 *     http body.
 * @param {boolean?} opt_starred Whether the document should be starred.
 * @return {string} The Atom xml as a string.
 */
gdocs.constructContentBody_ = function(title, docType, body, contentType,
                                       opt_starred) {
  var body = ['--END_OF_PART\r\n',
              'Content-Type: application/atom+xml;\r\n\r\n',
              gdocs.constructAtomXml_(title, docType, opt_starred), '\r\n',
              '--END_OF_PART\r\n',
              'Content-Type: ', contentType, '\r\n\r\n',
              body, '\r\n',
              '--END_OF_PART--\r\n'].join('');
  return body;
};



/**
 * Creates a new document in Google Docs.
 */
gdocs.createDoc = function(callback) {
console.log('gdocs.createDoc');
  var title = $.trim($('#doc_title').val());
  console.log('new doc title: ', title);
  if (!title) {
    util.displayError('Please provide a title.');
    switchFocus('doc_title');
    return;
  }
  	
  content = 'Title,Url,Date,Author,Summary,Tags'; 
  
  var starred = $('#doc_starred').is(':checked');
  var docType = 'spreadsheet';

  util.displayMsg('Creating document..');

  var handleSuccess = function(resp, xhr) {
  	console.log(resp, xhr);
  	if (xhr.status != 201) {
		console.log('ERROR', xhr);
		gdocs.handleError(xhr, resp);
		return;
	} else {
		bgPage.docs.splice(0, 0, new gdocs.GoogleDoc(JSON.parse(resp).entry));
	
		//Reset the doc creator.
		$('#new_doc_container').hide();
		$('#controlBar').show();
		$('#doc_title').val('');
		$('#doc_content').val('');
		util.displayMsg('Document created!');
		util.hideMsg();
	
		requestFailureCount = 0;
  		
  		//Update default doc on create. This is redundant but a useful check for edge cases.
	    localStorage['defaultDoc'] = bgPage.docs[0].resourceId.split(':')[1];
	    localStorage['defaultDocName'] = bgPage.docs[0].title; //If it is a new doc then the title will be 
  		
  		gdocs.renderDocSelect( function(){gdocs.amendDoc(bgPage.docs[0].resourceId,function(){ gdocs.moveDoc( callback, bgPage.docs[0].resourceId ) }) });
  	}
  };

  var params = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'multipart/related; boundary=END_OF_PART',
    },
    'parameters': {'alt': 'json'},
    
    //Calls constructContentBody to construct the body of the request.
    //Adds the results to params as json.
    'body': gdocs.constructContentBody_(title, docType, content,
                                        DEFAULT_MIMETYPES[docType], starred)
  };

  //Modifies params to account for presentation type quirks.
  //Presentation can only be created from binary content. Instead, create a blank presentation.
  /*if (docType === 'presentation') {
    params['headers']['Content-Type'] = DEFAULT_MIMETYPES['atom'];
    params['body'] = gdocs.constructAtomXml_(title, docType, starred);
  }*/
  util.displayMsg($('#butter').text() + '.');
  
  //Sends the params to the background page to get delivered to gDocs.
  bgPage.oauth.sendSignedRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
  console.log(bgPage.DOCLIST_FEED, params);
};



////////////////////////////////////////////////////////////
//Moves document to the citation folder
////////////////////////////////////////////////////////
gdocs.constructMoveManyBody_ = function(docs) { //pass in the docs list
console.log('gdocs.constructMoveManyBody');
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>"]
  for( var i, docId; docId = docs[i].resourceId; i++){
	  atom += ["<entry xmlns='http://www.w3.org/2005/Atom'>",
	  "<id>https://docs.google.com/feeds/default/private/full/", docId ,"</id>",
	  "</entry>"].join('');
	}
  return atom;
};

gdocs.constructMoveBody_ = function(docId) {
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
  		      "<entry xmlns='http://www.w3.org/2005/Atom'>",
              "<id>https://docs.google.com/feeds/default/private/full/", docId ,"</id>",
              "</entry>"].join('');
  return atom;
};

///////////////////////////////////////////////////////
gdocs.moveDoc = function(callback, docId) {
console.log('gdocs.moveDoc');
	
  //util.displayMsg('Moving to folder...');
  
  var i = 0;
  
  var handleSuccess = function(response, xhr) {
		console.log('moveDoc handleSuccess: ', xhr);
		
		if (xhr.status != 201) {
			console.log('ERROR', xhr);
			gdocs.handleError(xhr, response);
			if (xhr.status == 404) {
				gdocs.createFolder(0,move);
			} else {
				//Try again?
				return;
			}
		} else {
			//util.displayMsg('Folder added!');
			util.hideMsg();
			requestFailureCount = 0;
			++i; //Increment to the next document.
			if(!docId && i < bgPage.docs.length) { //Don't move th next if we have an override id, otherwise, move next.
				move(); //Call move() to move the next doc.
			} else { 
				console.log('gdocs.moveDoc handleSuccess -> CALLBACK');
				callback(); //End of the array, callback.
			}
		}
		
  };
  
	var move = function() {
		url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
		
		id = docId ? docId : bgPage.docs[i].resourceId; //If an override id is provided then use that, otherwise move all documents in doclist.

		var params = {
		'method': 'POST',
		'headers': {
		  'GData-Version': '3.0',
		  'Content-Type': 'application/atom+xml',
			},
			'parameters': {'alt': 'json'},
			'body': gdocs.constructMoveBody_(id)
			};
		
		//Sends the params to the background page to get delivered to gDocs.
		bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
		console.log('Move to:', url, params);
	};
	
	if(bgPage.docs.length) { move() }; //Call move() for the first time, if there are docs to move.

}



//////////////////////////////////////////////////////////////////////////////////
//Creates the row POST to ammend the given document
//////////////////////////////////////////////////////////////////////////////////

gdocs.constructSpreadAtomXml_ = function(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor) {
  
  var d = new Date();
  var curr_date = d.getDate();
  var curr_month = d.getMonth() + 1; //months are zero based
  var curr_year = d.getFullYear();
  var dd = curr_year + '/' + curr_month + '/' + curr_date;
  
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
  		      '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">',//'--END_OF_PART\r\n',
              '<gsx:title>',entryTitle,'</gsx:title>',//'--END_OF_PART\r\n',
              '<gsx:url>',entryUrl,'</gsx:url>',//'--END_OF_PART\r\n',
              '<gsx:summary>',entrySummary,'</gsx:summary>',//'--END_OF_PART\r\n',
              '<gsx:tags>',entryTags,'</gsx:tags>',
              '<gsx:date>',dd,'</gsx:date>',
              '<gsx:author>',entryAuthor,'</gsx:author>',
              '</entry>'].join('');
  return atom;
};

gdocs.parseForHTML = function(content) {
	//regular expression to find characters not accepted in XML.
    var rx= /(<)|(>)|(&)|(")|(')/g; 
	
	var content = content.replace(rx, function(m){
		switch(m)
		{
		case '<':
		  return '&lt;';
		  break;
		case '>':
		  return '&gt;';
		  break;
		case '&':
		  return '&amp;';
		  break;
		case '"':
		  return '&quot;';
		  break;
		case '\'':
		  return '&apos;';
		  break;
		default:
		  return m;
		  break;
		}
	});
	return content;
}

gdocs.constructSpreadBody_ = function(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor) {            
	
	entryTitle = gdocs.parseForHTML(entryTitle);
	entrySummary = gdocs.parseForHTML(entrySummary);
	entryUrl = gdocs.parseForHTML(entryUrl);
	entryTags = gdocs.parseForHTML(entryTags);
	entryAuthor = gdocs.parseForHTML(entryAuthor);
          
  var body = [
  gdocs.constructSpreadAtomXml_(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor), '\r\n',
  ].join('');
  
  return body;
};


gdocs.amendDoc = function(destination, callback) {
console.log('gdocs.amendDoc..');
  if(destination == 'new'){
	  title = $.trim($('#doc_title').val());
	  gdocs.createDoc(callback);
	  return;
  } else if(destination == null && localStorage['defaultDoc']){ //If the doc menu isn't loaded yet, then try using the default doc.
  	  	  gdocs.amendDocHandler(localStorage['defaultDoc'], callback);	 
			//TODO: create error in amendDocHandler to catch sending note to a document that doesn't exist.
  } else{
	  var parts = destination.split(':');
	  console.log('destination: ',parts[1],title);
	  gdocs.amendDocHandler(parts[1], callback);
  }
}

gdocs.amendDocHandler = function(docId, callback) {
  
  var summary = $('#summary').val();
  var title = $('#title').val();
  var url = $('#url').val();
  var tags = $('#tags').val();
  var author = $('#author').val();
    
  util.displayMsg('Adding citable..');

  var handleSuccess = function(resp, xhr) {
  	console.log('gdocs.amendDoc handleSuccess');
  	util.displayMsg($('#butter').text() + '.');
    if (xhr.status != 201) {
			console.log('ERROR', xhr);
			gdocs.handleError(xhr, resp);
			return;
	} else {
		util.displayMsg('Citable added!');
		util.hideMsg();
	
		requestFailureCount = 0;
		
		console.log('Ammend: ', resp, xhr);
		
		callback();
	}
  };
  
  util.displayMsg($('#butter').text() + '.');
  
  var params = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml'
    },

    'body': gdocs.constructSpreadBody_(title, url, summary, tags, author)
    
  };
  
  var worksheetId = 'od6';

  var url = bgPage.SPREAD_SCOPE +'/list/'+docId+'/'+worksheetId+'/private/full';

  //sends the params to the background page to get delivered to gDocs
  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
  console.log('Citation: ', url, params);
};



/**
 * Updates a document's metadata (title, starred, etc.).
 * @param {gdocs.GoogleDoc} googleDocObj An object containing the document to
 *     update.
 */
gdocs.updateDoc = function(googleDocObj) {
  var handleSuccess = function(resp) {
    requestFailureCount = 0;
  };

  var params = {
    'method': 'PUT', //use put for modifying a file
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml',
      'If-Match': '*'
    },
    'body': gdocs.constructAtomXml_(googleDocObj.title, googleDocObj.type,
                                    googleDocObj.starred)
  };

  //Gets the url to the document in question.
  var url = bgPage.DOCLIST_FEED + googleDocObj.resourceId;
  
  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

/**
 * Deletes a document from the user's document list.
 * @param {integer} index An index intro the background page's docs array.
 */
gdocs.deleteDoc = function(index) {
  var handleSuccess = function(resp, xhr) {
    //util.displayMsg('Document trashed!');
    //util.hideMsg();
    requestFailureCount = 0;
    bgPage.docs.splice(index, 1);
  }

  var params = {
    'method': 'DELETE',
    'headers': {
      'GData-Version': '3.0',
      'If-Match': '*'
    }
  };

  $('#output li').eq(index).fadeOut('slow');

  bgPage.oauth.sendSignedRequest(
      bgPage.DOCLIST_FEED + bgPage.docs[index].resourceId,
      handleSuccess, params);
};



gdocs.renderDocSelect = function(callback) {
console.log('gdocs.renderDocSelect');
	//util.displayMsg('Documents found!');
	util.hideMsg();
	var found = false; //Variable to track whether the default doc is in the list.
	var html = [];
	if(bgPage.docs.length) {
		//html.push('<option selected value="',bgPage.docs[0].resourceId,'">',bgPage.docs[0].title.truncate(),'</option>'); //Have the first document be selected.
		var docKey;
		var selected;
		
		for (var i = 0, doc; doc = bgPage.docs[i]; ++i) {
			docKey = doc.resourceId.slice(12);
			//selected = i==0?'selected':'';
			selected = docKey==localStorage['defaultDoc']?'selected':'';
			found = selected=='selected'?true:found;
			html.push('<option ',selected,' value="',doc.resourceId,'">',doc.title.truncate(),'</option>');
		}
				
		//On the first run after update, update all documents in the background.
		//Conditional on bgPage.docs.length to fire only after successfully retrieving doc list.
		if(bgPage.firstRun == true){ //Check for flag.
		console.log('bgPage.firstRun ',bgPage.firstRun);
		//bgPage.firstRun = false; //Moved to update callback to bgPage.updateDocumentCallback.
		bgPage.updateDocument(bgPage.updateDocumentCallback); //Intitiate update.
		}
		
	}
	
	$('#selection').html('<select id="destination" class="Droid" name="destination"><option value="new">Create New Document</option>' + html.join('') + '</select>');
	
	console.log('!found');
	if(!found){
		//If no default doc was found then select the first option after new.
		if($('select option').length>1){
			$('select option').get(1).selected = true; //Select the second item.
		}
	}

//gdocs.changeAction(this.form, null); //TODO what does this do???? It was part of a stable build.

	setTabOrder(order); //Resets the tab order to include this selection menu and the addNote button.
	
	//Edit: 7/22 to fix switch focus after typing.
	//switchFocus(order[0]); //On refresh switches focus to the summary field.
	
	document.querySelector('#destination').addEventListener('change', onChangeHandler);
	
	//Initialize defaultDoc
	if(!localStorage['defaultDoc'] || !found){ 
		console.log('default doc in renderSelect: ',localStorage['defaultDocName'], found);
		var parts = $('#destination').val().split(':');
		localStorage['defaultDoc'] = parts[1];
		
		localStorage['defaultDocName'] = $('select option:selected').html();
	}
	
	console.log('callback');
	setTimeout(function(){if(callback){ callback() };},10);
}



/**
 * Fetches the user's document list.
 * @param {string?} opt_url A url to query the doclist API with. If omitted,
 *     the main doclist feed uri is used.
 */
gdocs.getDocumentList = function(opt_url, callback) {
	console.log('gdocs.getDocumentList');
	//util.displayMsg('Fetching your docs..');
  
	var handleSuccess = function(response, xhr) {
		console.log('gdocs.getDocumentList handleSuccess', xhr);
		//util.displayMsg($('#butter').text() + '.');
		if (xhr.status != 200) {
			gdocs.handleError(xhr, response);
			callback(xhr.status); //Return the error to the calling function.
			return;
		} else {
			requestFailureCount = 0;
		}
		
		var data = JSON.parse(response);
		
		console.log('Doc list data. Should have entries. ', data);
		  
		if(data.feed.entry) {
			console.log('process feed');
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				bgPage.docs.push(new gdocs.GoogleDoc(entry));
			}
			
			var nextLink = gdocs.getLink(data.feed.link, 'next');
			if (nextLink) {
				gdocs.getDocumentList(nextLink.href); // Fetch next page of results.
			} else {
				console.log("render doc list");
				gdocs.renderDocSelect(callback); //Pass callback to renderDocSelect, to callback directly from there.
			}
		} else {
			console.log("create new document");
			util.displayMsg('No documents found.');
			util.hideMsg();
			gdocs.renderDocSelect(function() {
				gdocs.changeAction(this.form,'new');
			}); //Open the field to create a new doc after creating the new folder.
		}
		
		if(callback){ callback() }; //Callback with null.
	};
	
  var changeAction = function() {
		gdocs.changeAction(this.form,'new'); 
  };
  
  var url = opt_url || null; //Set the url if one was passed in.

  var params = {
    'headers': {
      'GData-Version': '3.0'
    },
    'parameters': {
	  'alt': 'json',
	  'showfolders': 'true'
	}
  };

  if (!url) {
	//If no url was passed in set the url to first folder in bgPage.cat.
    url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
    
  } else {
    //util.displayMsg($('#butter').text() + '.');

	bgPage.docs = []; // Clear document list. We're doing a refresh.

	/*params['parameters'] = {
      'alt': 'json',
      'showfolders': 'true'
    };*/

    var parts = url.split('?');
    if (parts.length > 1) {
      url = parts[0]; // Extract base URI. Params are passed in separately.
      params['parameters'] = util.unstringify(parts[1]);
    }
  }

  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

////////////////////////////////////////////////////
////////////////////////////////////////////////////
/*gdocs.processDocContent = function(response, xhr) {
	console.log('rows returned: ', xhr);
  
  	bgPage.row = [];
  
	if (xhr.status != 200) {
		gdocs.handleError(xhr, response);
		return;
	} else {
		requestFailureCount = 0;
	}
	
	var data = JSON.parse(response);
	//console.log('row data: ',data,Boolean(data.feed.entry));
	if(data.feed.entry) {
		
		for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
			console.log(i);
			bgPage.row.push(new gdocs.Row(entry));
			//console.log(entry);
		}
		console.log('rows: ', bgPage.row);
		bgPage.printDocumentPage(onPrintPage);
	
	} else {
		console.log('No entries');
		util.displayError('Invalid file.');
		util.hideMsg();
	}
};*/

gdocs.processDocContent = function(response, xhr, callback) {
	console.log('rows returned: ', xhr);
  
  	bgPage.row = [];
  
	if (xhr.status != 200) {
		gdocs.handleError(xhr, response);
		return;
	} else {
		requestFailureCount = 0;
	}
	
	var data = JSON.parse(response);
	//console.log('row data: ',data,Boolean(data.feed.entry));
	if(data.feed.entry) {
		
		for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
			console.log(i);
			bgPage.row.push(new gdocs.Row(entry));
			//console.log(entry);
		}
		console.log('rows: ', bgPage.row);
		callback();
	
	} else {
		console.log('No entries');
		util.displayError('Invalid file.');
		util.hideMsg();
	}
};


////////////////////////////////////////////////////
gdocs.printDocument = function(destination) {
	if(destination == 'new'){ 
		return; 
	} else if(destination == null && localStorage['defaultDoc']){ 
	//If the doc menu isn't loaded yet, then try using the default doc.
  	  	  bgPage.docKey = localStorage['defaultDoc'];	
  	  	  bgPage.docName = localStorage['defaultDocName']; 
    } else {
		bgPage.docName = bgPage.docs[$("select option").index($("select option:selected"))-1].title;
		var parts = destination.split(':');
		bgPage.docKey = parts[1];
	}
	console.log('gdocs.printDocument');
	var worksheetId = 'od6';
    var url = bgPage.SPREAD_SCOPE +'/list/'+bgPage.docKey+'/'+worksheetId+'/private/full'; //good
    
    var params = {
    'headers': {
      'GData-Version': '3.0'
    },
   'parameters': {
      'alt': 'json',
    }
    };
    bgPage.oauth.sendSignedRequest(url, function(response, xhr){gdocs.processDocContent(response,xhr,function(){bgPage.printDocumentPage(onPrintPage)} )}, params);
};

gdocs.exportDocument = function(destination){
	if(destination == 'new'){ return; }
	else if(destination == null && localStorage['defaultDoc']){ 
	//If the doc menu isn't loaded yet, then try using the default doc.
  	  	  bgPage.docKey = localStorage['defaultDoc'];	
  	  	  bgPage.docName = localStorage['defaultDocName']; 
    } else {
		bgPage.docName = bgPage.docs[$("select option").index($("select option:selected"))-1].title;
		var parts = destination.split(':');
		bgPage.docKey = parts[1];
	}
	console.log('gdocs.exportDocument');
	var worksheetId = 'od6';
    var url = bgPage.SPREAD_SCOPE +'/list/'+bgPage.docKey+'/'+worksheetId+'/private/full'; //good
    
    var params = {
    'headers': {
      'GData-Version': '3.0'
    },
   'parameters': {
      'alt': 'json',
    }
    };
    
	//bgPage.exportDocument(onPrintPage);
	bgPage.oauth.sendSignedRequest(url, function(response, xhr){gdocs.processDocContent(response,xhr,function(){bgPage.exportDocument(onPrintPage)} )}, params);
}

gdocs.viewDoc = function(destination) {
	if(destination == 'new'){ return; }
	var parts = destination.split(':');
	var tabUrl = 'https://docs.google.com/spreadsheet/ccc?key='+parts[1];
	chrome.tabs.create({url: tabUrl});
	window.close();
}



gdocs.constructFolderBody_ = function(title) {
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
  		      "<entry xmlns='http://www.w3.org/2005/Atom'>",
              "<category scheme='http://schemas.google.com/g/2005#kind' term='http://schemas.google.com/docs/2007#folder' />",
              "<title type='text'>Citable_Documents</title>",
              "</entry>"].join('');
  return atom;
};

gdocs.createFolder = function(title, callback) {
console.log('gdocs.createFolder ', title);
  
	var handleSuccess = function(response, xhr) {
		console.log('category returned: ', xhr);
		
		if (xhr.status != 201) {
			console.log('ERROR', xhr);
			gdocs.handleError(xhr, response);
			return;
		} else {
			//util.displayMsg('Folder added!');
			//util.hideMsg();
			requestFailureCount = 0;
		}
		
		bgPage.cat.splice(0, bgPage.cat.length, new gdocs.Category(JSON.parse(response).entry)); //Resets the cat list to have only the new folder id.
		var parts = bgPage.cat[0].resourceId.split(':');
		var resourceId = parts[1];
		console.log('category: ', resourceId, ' : ', bgPage.cat[0]);
				
		callback(resourceId);
		
	}; 
  	
  //util.displayMsg('Creating folder...');
  console.log('Creating folder...');
  
  var params = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml',
    },
    'parameters': {'alt': 'json'},
    'body': gdocs.constructFolderBody_(folders[title])
  };

  //Sends the params to the background page to get delivered to gDocs.
  bgPage.oauth.sendSignedRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
  console.log('FOLDER:', bgPage.DOCLIST_FEED, params);
};


////////////////////////////////////////////////////////////
//Searches for the specific category passed in through title
////////////////////////////////////////////////////////////

gdocs.getFolder = function(title, callback) {
console.log('gdocs.getFolder');

  var params = {
    'headers': {
      'GData-Version': '3.0'
    }
  };
	
	var handleSuccess = function(response, xhr) {
		console.log('getFolder handleSuccess: ', xhr);
		
		if (xhr.status != 200) {
			gdocs.handleError(xhr, response);
			return;
		} else {
			requestFailureCount = 0;
		}
		
		var data = JSON.parse(response);
		
		console.log(data);
		
		if(data.feed.entry) {
			console.log('parse folders');
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				bgPage.cat.push(new gdocs.Category(entry));
			}
			console.log('folder Id: ', bgPage.cat[bgPage.cat.length-1].resourceId);
			callback(bgPage.cat[bgPage.cat.length-1].resourceId);
  		} else {
  			callback(null);
  		}
  		util.hideMsg();
	}

    //util.displayMsg('Fetching your docs');

    url = bgPage.DOCLIST_FEED; //+ '?title=%22PR+Citation_Tool_Documents%22'; //retrieves the citations folder
    params['parameters'] = {
      'alt': 'json',
      'title': folders[title],
      'showfolders': 'true',
      'title-exact': 'true'
    };
    
  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

/////////////////////////////////////////////////////////////

gdocs.updateFolders = function(callback) {
	console.log('gdocs.updateFolders');
	
	var createFolderCallback = function(id) {
		console.log('gdocs.updateFolders createFolderCallback', id);
		gdocs.getFolder(1, getFolderCallback); //Check for the old folder.
	}
	
	var getFolderCallback = function(id) {
		console.log('gdocs.updateFolders getFolderCallback', id);
		if( id == null ){
			url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
			gdocs.getDocumentList(url, gdocs.start.getDocumentListCallback); //??? Fix the callback
		} else {
			url = bgPage.DOCLIST_FEED + id + '/contents'; //id should be stored in bgPage.cat[1] for reference. Consider moving this to getDocumentList() and pass in the folder[] interger.
			gdocs.getDocumentList(url, getDocListCallback);
		}
	}
	
	var getDocListCallback = function(e) {
		console.log('gdocs.updateFolders getDocListCallback', e);
		gdocs.moveDoc(moveDocCallback); //If no error is returned, then move the docs.
	}
	
	var moveDocCallback = function() {
		console.log('gdocs.updateFolders moveDocCallback');
		bgPage.docs = []; //Clear docs list.
		callback();
	}

	gdocs.createFolder(0,createFolderCallback);
}

gdocs.start = function() {
	console.log('gdocs.start');
	
	var getFolderCallback = function(id) {
		console.log('gdocs.start getFolderCallback ', id);
		if ( id == null ) {
			gdocs.updateFolders(updateFoldersCallback);
		} else {
			setTimeout(function(){
				url = bgPage.DOCLIST_FEED + id + '/contents';
				gdocs.getDocumentList(url, getDocumentListCallback);
			});
			console.log('append docName: ',localStorage['defaultDocName']);
		}
	}
	
	var getDocumentListCallback = function(e) {
		console.log('gdocs.start getDocumentListCallback ', e);
		
		if(e) { gdocs.getFolder(0, getFolderCallback); } //If the getDocumentList function can't find the documents, then the id is for a folder that doesn't exist and we need to get the new id.
		//End of Start.
	}
	
	var updateFoldersCallback = function() {
		console.log('gdocs.start updateFoldersCallback');
		gdocs.getDocumentList(); //Get the first folder, no callback.
	}
	
	
	//TODO: Do we need to check for the new folder every time, or can we speed this up?
	/*if (bgPage.cat[0]) {
		console.log('bgPage.cat[0] has id');
		url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
		gdocs.getDocumentList(url, getDocumentListCallback); 
	} else {*/
		
		
		console.log('bgPage.cat[0] does not have id');
		setTimeout(function(){ gdocs.getFolder(0, getFolderCallback); });
		
		if(localStorage['defaultDocName']){ //TODO:update to not show anything when the doc is deleted...
			console.log('default doc status in .start',localStorage['defaultDocName']);
			$('#selection').append('<div id="docName">'+localStorage['defaultDocName']+'</div>'); 
		}
	//}
}

///////////////////////////////////////////////////////////////
// Refreshes the user's document list.
///////////////////////////////////////////////////////////////

gdocs.refreshDocs = function() {
  console.log('refreshing docs');
  bgPage.clearPendingRequests();
  gdocs.getDocumentList(); //Get the first folder, no callback.
  util.scheduleRequest();
};


/////////////////////////////////////
//Important for the doclist features.
////////////////////////////////////
bgPage.oauth.authorize(function() {
  util.scheduleRequest();  
});


  // Call the getPageInfo function in the background page, passing in our onPageInfo function as the callback.
        //var bg = chrome.extension.getBackgroundPage();
        if (bgPage.oauth.hasToken()) {
        	
        	window.onload = function() 
        	{ 
            	console.log('page loaded');
            //var bg = chrome.extension.getBackgroundPage();
            	//Load variables into fields.
            	//onPageInfo(bgPage.fieldData);
            	//bgpage.callbacks = [];
				bgPage.getPageInfo(onPageInfo);
				
				switchFocus(order[0]); //Switches focus to the summary field.
				
            	gdocs.start();
            }

        }
        else {
        	console.log('hasToken == false')
        }