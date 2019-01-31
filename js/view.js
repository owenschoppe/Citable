//In the app's launch page:
// var bgPage;
// chrome.runtime.getBackgroundPage(function(ref){
// 	bgPage = ref;
// 	bgPage.toggleAuth(true,function(){
// 		startup();
// 	});
// });
// var bgPage = chrome.extension.getBackgroundPage();
var bgPage;
chrome.runtime.getBackgroundPage(function(ref) {
  bgPage = ref;
  bgPage.toggleAuth(true, function() {
    startup();
  });
});

function fontHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Change Font']);
  changeFont(this.form, this.value);
}

function orientHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Change Orientation']);
  changeOrient(this.form, this.value);
}

function mHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Change Template']);
  //console.log('mHandler',e);
  changeTemplate(this.form, this.checked);
}

function printHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Print Stickies']);
  printDocumentPage();
  return false;
}

function cancelHandler(e) {
  console.log('close window');
  _gaq.push(['_trackEvent', 'Button', 'Cancel Print']);
  window.open('', '_self', ''); //bug fix. This is a hack and may not be future proof. Works by crashing window.open?
  window.close();
  return false;
}

function templateHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Print Template']);
  openTemplate();
  return false;
}

//Listeners
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#typed').addEventListener('change', fontHandler);
  document.querySelector('#hand').addEventListener('change', fontHandler);
  document.querySelector('#landscape').addEventListener('change', orientHandler);
  document.querySelector('#portrait').addEventListener('change', orientHandler);
  //document.querySelector('#mInput').addEventListener('change', mHandler);
  document.querySelector('#cancel-button').addEventListener('click', cancelHandler);
  document.querySelector('#template-button').addEventListener('click', templateHandler);
});
/////////////////////////////////////////////////////////////////////////////////////
//Global variables.
//var pages = 0;

var SPREAD_SCOPE = 'https://spreadsheets.google.com/feeds';
var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var FULL_SCOPE = DOCLIST_SCOPE + ' ' + SPREAD_SCOPE;

var docKey; //The doc key for the document to print.
var title; //The doc title to print
//var rows = bgPage.row;
var rows = []; //From printexport.js
//console.log(rows);

var renderCallback = function(container, pages, callback) {
  console.log('renderCallback', container, pages, callback);
  //Loads the right number in to the controlbar.

  document.title = 'Citable - ' + title;

  setTotal(pages);
  var output = document.getElementById('output');
  //output.appendChild(container);
  output.hasChildNodes() ? output.replaceChild(container, output.firstChild) : output.appendChild(container);
  document.querySelector('#loading').classList.add('hidden'); //Hide the loading gif.
  document.querySelector('#print-button').addEventListener('click', printHandler);
  document.querySelector('#print-button').disabled = false;
  console.timeEnd('renderNotes timer');

  makeDraggable();

  //setTemplate(localStorage.m == 'true');

  if (callback) {
    callback();
  }
};

var renderNotes = function(rows, callback) {
  console.log('renderNotes()');
  render(rows, renderCallback, callback);
};

//Sets the helper text in the control bar to display the total number of pages.
setTotal = function(pages) {
  //if(num){ pages = num; }
  console.log('Set total: ', pages);
  var total = "<span class='Droid regular'>Total: </span><span class='Droid bold'>" + pages + " sheets of stickies</span>";
  document.getElementById('total').innerHTML = total;
};

//TODO: Create a new function to update the spreadsheet contents based on the changes
// Persistent click handler for changing the title of a document.
/*
$('[contenteditable="true"]').live('blur', function(index) {
  var index = $(this).parent().attr('data-index');
  // Only make the XHR if the user chose a new title.
  //if ($(this).text() != bgPage.docs[index].title) {
  var r = rows[index];
  if ($(this).text() != rows[index]['title']) {
  	console.log('old title: ',rows[index]['title'],' new title: ',$(this).text(),' original title: ',rows[index].title);


	//bgPage.r[index].title = $(this).text(); //ok

	//gdocs.updateDoc(bgPage.docs[index]);
  }
}); */

//Prints this page. Doesn't work if it is clicked too often in a period of time. Use Command+P instead.
function printDocumentPage(callback) {
  console.log('open print dialog');
  window.print();
  console.log('done printing');
  //chrome.tabs.create({ 'url' : 'print.html'});
  if (callback) {
    callback();
  }
}

//Opens a new tab that prints a template.
function openTemplate() {
  var onStorage = function(items) {
    console.log('openTemplate.onStorage', items);
    if (items.orientation == 'portrait') {
      console.log('Open portrait template, ', items.orientation);
      chrome.tabs.create({
        'url': 'template-portrait.html'
      });
    } else {
      console.log('Open landscape template, ', items.orientation);
      chrome.tabs.create({
        'url': 'template-landscape.html'
      });
    }
  };
  chrome.storage.local.get('orientation', onStorage);
}

//Changes which font is used.
changeFont = function(formName, elementName) {
  console.log('changeFont() ', elementName);
  //Caches the font value;
  chrome.storage.local.set({
    'font': elementName
  });

  if (elementName == 'Droid') {
    console.log('toggle to Droid');
    document.querySelectorAll('.summary, .title, .author, .url, .tags, .fontIcon').forEach((item) => {
      item.classList.toggle('handwritten');
      item.classList.toggle('Droid')
    });
  } else {
    console.log('toggle to handwritten');
    document.querySelectorAll('.summary, .title, .author, .url, .tags, .fontIcon').forEach((item) => {
      item.classList.toggle('handwritten');
      item.classList.toggle('Droid')
    });
  }
  return;
};

//Changes the orientation of the page.
changeOrient = function(aForm, aValue) {
  console.log('changeOrient() ', aValue);
  //Saves the orientation setting in localStorage.
  chrome.storage.local.set({
    'orientation': aValue
  });

  if (aValue == 'portrait') {
    console.log('toggle to portrait');
    document.querySelectorAll('.page, .loading').forEach((item) => {
      item.classList.toggle('landscape');
      item.classList.toggle('portrait');
    });
    document.querySelectorAll('.landscapeIcon, .portraitIcon').forEach((item) => {
      item.classList.toggle('hidden');
    });
    //toggleCSS(1,noteOrderCSS);
    toggleCSS(1);
    bgPage.resizeWindow('printable', 1200, 1110);
  } else {
    console.log('toggle to landscape');
    document.querySelectorAll('.page, .loading').forEach((item) => {
      item.classList.toggle('landscape');
      item.classList.toggle('portrait');
    });
    document.querySelectorAll('.landscapeIcon, .portraitIcon').forEach((item) => {
      item.classList.toggle('hidden');
    });
    toggleCSS(0);
    bgPage.resizeWindow('printable', 1440, 900);
  }

};

//Changes the template.
changeTemplate = function(aForm, aValue) {
  console.log('changeTemplate() ', aValue);
  chrome.storage.local.set({
    'm': aValue
  });

  if (aValue == true) {
    document.querySelectorAll('.page').forEach((item) => {
      item.classList.add('m');
    });
    document.querySelector('#template-button').disabled = true;
  } else {
    document.querySelectorAll('.page').forEach((item) => {
      item.classList.remove('m');
    });
    document.querySelector('#template-button').disabled = false;
  }
};

//Generic function that intializes the form to match the previous settings stored in localStorage.
initRadio = function(value, key, formName, elementName, callback) {
  console.log('initRadio() ', value);
  if (value) {
    if (value == key) {
      console.log('Default');
      document.forms[formName].elements[elementName][0].checked = true;
      if (callback) {
        callback(0);
      }
    } else {
      console.log('Not Default');
      document.forms[formName].elements[elementName][1].checked = true;
      if (callback) {
        callback(1);
      }
    }
  } else {
    console.log('Initialize');
    document.forms[formName].elements[elementName][0].checked = true;
    if (callback) {
      callback(0);
    }
  }
};

initCheck = function(value, key, formName, elementName, callback) {
  console.log('initCheck() ', value);
  if (value) {
    value = (value == 'true');
    console.log(value, key, value == key);
    if (value == key) {
      console.log('Default');
      document.forms[formName].elements[elementName].checked = value;
      if (callback) {
        callback(value);
      }
    } else {
      console.log('Not Default');
      document.forms[formName].elements[elementName].checked = value;
      if (callback) {
        callback(value);
      }
    }
  } else {
    console.log('Initialize');
    document.forms[formName].elements[elementName].checked = key;
    //$('#'+elementName).prop("checked", key);
    if (callback) {
      callback(key);
    }
  }
};

//Toggles on and off the landscape and portrait CSS sheets to set the page orientation when printing.
var toggleCSS = function(dir, callback) {
  console.log('toggleCSS() ', dir);
  switch (dir) {
    case 0: //landscape
      chrome.storage.local.set({
        'orientation': 'landscape'
      });
      //Toggles which @Page css sheet is used.
      document.styleSheets[0].disabled = false; //TODO: what is a faster way to handle this. Could save a couple seconds.
      document.styleSheets[1].disabled = true;
      //Toggles the visibility of the helper icons in the control bar.
      document.querySelectorAll('.landscapeIcon').forEach((item) => {
        item.classList.remove('hidden');
      });
      document.querySelectorAll('.portraitIcon').forEach((item) => {
        item.classList.add('hidden');
      });
      break;
    case 1: //portrait
      chrome.storage.local.set({
        'orientation': 'portrait'
      });
      //Toggles which @Page css sheet is used.
      document.styleSheets[1].disabled = false;
      document.styleSheets[0].disabled = true;
      //Toggles the visibility of the helper icons in the control bar.
      document.querySelectorAll('.landscapeIcon').forEach((item) => {
        item.classList.add('hidden');
      });
      document.querySelectorAll('.portraitIcon').forEach((item) => {
        item.classList.remove('hidden');
      });
      break;
  }

  if (callback) {
    callback(dir);
  }
};
///////////////////////////
//No Longer Used
///////////////////////////
var noteOrderCSS = function(dir) {
  //Removes the note placement classes in preparation for changing them.
  document.querySelectorAll('.note_wrapper').forEach((item) => {
    item.classList.remove('left', 'middle', 'right');
  });
  switch (dir) {
    case 0: //landscape
      //Changes the classes of the notes for display purposes.
      document.querySelectorAll('.note_wrapper').forEach((item,index) => {
        var className = index % 3 == 0 ? "left" : (index % 3 == 1 ? "middle" : "right");
        //TODO: rewrite this function to not use switch. (This will be pretty but will have a negligible speed boost.)
        //Instead use columns(2 or 3), such that 'return index%col==0 ? "left" : (index%col==1 ? "middle" : "right");'
        //The middle class may need to be rewritten.
        item.classList.add(className);
      });
      break;
    case 1: //portrait
      //Changes the classes of the notes for display purposes.
      document.querySelectorAll('.note_wrapper').forEach((item,index) => {
        var className = index % 2 == 0 ? "left" : "right";
        item.classList.add(className);
      });
      break;
  }
};

//Changes the font used in the helper icon in the control bar.
var setFontIcon = function(dir) {
  if (dir == 0) {
    chrome.storage.local.set({
      'font': 'Droid'
    });
  } else {
    chrome.storage.local.set({
      'font': 'handwritten'
    });
  }

  chrome.storage.local.get('font', function(items) {
    document.querySelector('.fontIcon').classList.add(items.font);
  });
};

var setTemplate = function(dir) {
  console.log('setTemplate() ', dir);
  if (dir == true) {
    document.querySelector('.page').classList.add('m');
    document.querySelector('#template-button').disabled = true;
    console.log('addClass');
  } else {
    //$('.page').removeClass('m');
    //document.querySelector('#template-button').disabled = false;
    console.log('removeClass');
  }
};

/*
//Adjusts which elements are visible and saves the value in localStorage.
changeElement = function(formName, elementName) {
	localStorage[elementName] = Boolean(document.getElementById(elementName).checked);
	var classElement = String('.'+elementName.replace('1',''));
	//console.log(classElement,elementName);
	$(classElement).toggle(localStorage[elementName]=='true' ? true : false);
	//console.log('changeElement ', formName, elementName, localStorage[elementName]=='true', localStorage[elementName]);
	if(classElement == '.url'){ $('.author').toggleClass(function(){return 'full'},(localStorage[elementName]=='true'?false:true)); };//Toggle width 100%
	if(classElement == '.author'){ $('.url').toggleClass(function(){return 'full'},(localStorage[elementName]=='true'?false:true)); };
}

//Initialize checkbox controls.
initCheck = function(formName, elementName) {
	console.log('initCheck', elementName, localStorage[elementName]);
	if(localStorage[elementName]){
		if(localStorage[elementName] == 'true'){
			$('#'+elementName).prop("checked", true);
		} else {
			$('#'+elementName).prop("checked", false);
		}
	} else {
		console.log('No value ', localStorage[elementName]);
		localStorage[elementName] = Boolean(true);
		$('#'+elementName).prop("checked", true);
	}
	changeElement(formName, elementName);
}
*/

changeAction = function(formName, formValue, rows) {
  console.time('loading timer');

  var handleResponse = function(items) {
    console.log('changeAction.onStorage', formName, formValue, rows, items);
    document.querySelector('#loading').classList.remove('hidden');
    var valuesArray = items[docKey];
    var i = parseInt(formName.substr(5, 1));
    //if(isNumber(i)){
    valuesArray[i] = formValue;
    chrome.storage.local.set({
      [docKey]: valuesArray
    });
    //rerenderNotes(formName);
    //setTimeout(function(){rerenderNotes(i,valuesArray)},0);
    setTimeout(function() {
      console.time('renderNotes timer');
      renderNotes(rows, timerEnd);
    }, 0);
    //console.log(localStorage);
    /*} else {
    	console.log('parse formName error');
    }

    function isNumber (o) {
      return ! isNaN (o-0);
    }*/

    var timerEnd = function() {
      console.timeEnd('loading timer');
    };
  };

  chrome.storage.local.get(docKey, handleResponse);

};


function parseURLParams(url) {
  var queryStart = url.indexOf("?") + 1;
  var queryEnd = url.indexOf("#") + 1 || url.length + 1;
  var query = url.slice(queryStart, queryEnd - 1);

  if (query === url || query === "") return;

  var params = {};
  var nvPairs = query.replace(/\+/g, " ").split("&");

  for (var i = 0; i < nvPairs.length; i++) {
    var nv = nvPairs[i].split("=");
    var n = decodeURIComponent(nv[0]);
    var v = decodeURIComponent(nv[1]);
    if (!(n in params)) {
      params[n] = [];
    }
    params[n].push(nv.length === 2 ? v : null);
  }
  return params;
}

//Callback after creating the document menu.
var getDocId = function() {
  console.log('getDocId()');
  if (document.querySelectorAll('#destination').length) {
    //Menu exists-> load document.
    console.log('Document menu exists');
    //TODO: fix this
    // docKey = $('#destination').val();
    console.log('docKey: ', docKey);
    gdocs.printDocument(null, processRowsCallback); //In printexport.js
  } else {
    //Menu does not exist-> redirect to Drive.
    console.log('No document menu.');
    //$('#loading').addClass('hidden'); //Hide the loading gif.
    document.querySelector('#loading').innerHTML = ('Try printing directly from a spreadsheet in <a href="https://drive.google.com">Google Drive</a>.');
  }
};

//TODO: Can we remove the redundant variable 'row' and improve efficiency with explicit passing?

//IMPORTANT TODO: Rewrite the whole process around a function queue, thus on changeAction will clear the queue and start over. BIG project. Is it possible to abort functions midway without explicitly checking for a flag?
/*------------------------------------------------------------------------------------------*/
async function processRowsCallback() {
  rows = row; //From printexport.js
  console.log('processRowsCallback()', rows);

  //Parse column names.
  var cols = [];
  for (var key in rows[1]) {
    if (rows[1].hasOwnProperty(key)) {
      cols.push(key);
    }
  }
  console.log('Cols: ', cols);

  //Set the default field names
  var defaultFields = ['field0', 'field1', 'field2', 'field3', 'field4'];
  var defaultColumns = ['summary', 'title', 'author', 'url', 'tags'];


  //Build the select controls
  buildSelect(cols, defaultFields);


  //Initialize the select control values
  async function initSelects() {
    async function handleResponse(response) {
      console.log('get local storage', response);
      var valuesArray = [];
      for (var i = 0; i < 5; i++) {
        valuesArray.push(initSelect(i, cols, defaultFields, defaultColumns, response));
      }
      await chrome.storage.local.set({
        [docKey]: valuesArray
      }, function(r) {
        console.log(r);
      });
    }
    await chrome.storage.local.get(docKey, function(response) {
      handleResponse(response);
    });
  }

  async function onSet() {

    //console.log(localStor.get(''));
    //Init CSS
    var onStorage = function(items) {
      console.log('processRowsCallback.onStorage', items);
      toggleCSS((items.orientation == 'portrait' ? 1 : 0)); //Important: No callback defined.
      //1 sec
      console.time('renderNotes timer');
      //renderNotes(makeSortable); //makeSortable >2sec
      renderNotes(rows);
      //renderNotes(makeDraggable);
    };

    await chrome.storage.local.get('orientation', onStorage);
  };

  // chrome.storage.local.set({[docKey] : defaultColumns}, onSet);
  initSelects();
  onSet();
};

/*------------------------------------------------------------------------------------------*/
//Render select controls.
function buildSelect(cols, defaultFields, callback) {
  console.log('buildSelect()');
  var html = [];
  for (var col in cols) {
    html.push('<option value="', cols[col], '">', cols[col], '</option>');
  }
  //TODO: Change this to i<defaultFields.length for a fully generalized function.
  var valuesArray = [];
  for (var i = 0; i < 5; i++) {
    var j = (i == 2 || i == 3) ? 'split' : 'full';
    var name = "field" + i;
    var div = document.createElement('div');
    div.innerHTML = ('<label for="' + name + '" class="visuallyhidden">Area ' + (parseInt(i) + 1) + '</label><select id="' + name + '" class="Droid select ' + j + '" name="' + name + '" ><option value="none">None</option>' + html.join('') + '</select>');
    div.classList.add('option', name);
    document.querySelector('#elements').append(div);
    name = "#" + name;
    document.querySelector(name).addEventListener('change', onChangeHandler);
  }

  /*document.querySelector('#field0').addEventListener('change', onChangeHandler);
  document.querySelector('#field1').addEventListener('change', onChangeHandler);
  document.querySelector('#field2').addEventListener('change', onChangeHandler);
  document.querySelector('#field3').addEventListener('change', onChangeHandler);
  document.querySelector('#field4').addEventListener('change', onChangeHandler);*/

  if (callback) callback();
};

function onChangeHandler(e) {
  changeAction(this.name, this.value, rows);
}

/*------------------------------------------------------------------------------------------*/
//Initialize select controls.
function initSelect(i, cols, defaultFields, defaultColumns, storageResponse) {

  // var handleResponse = function(items) {
  var fieldId = defaultFields[i];
  // console.log('initSelect.onStorage', fieldId, i, items, items[i], docKey);
  // var i = parseInt(fieldId.substr(5,1)); //Done. TODO: pass in i to boost speed.
  var valuesArray = [];
  if (storageResponse[docKey] && Array.isArray(storageResponse[docKey])) {
    valuesArray = storageResponse[docKey]; //Get array using the document id as the object key value.
  }
  // else { //Initialize localStorage for the doc if no record is found.
  //   chrome.storage.local.set({[docKey] : defaultColumns}, function(r){ console.log(r); });
  // }
  ////////////////////////////
  //TODO: Move this to it's own function and rewrite. It should store create an initial default menu set on init.

  if (valuesArray && valuesArray[i]) { //If i in the array exists use that. //Should we check that that col still exists in document?
    console.log('Existing value:', valuesArray[i]);
    //Updates the select control position.
    document.querySelector("select[name='" + defaultFields[i] + "']").value = (valuesArray[i]);
    selectedOption = valuesArray[i];
  } else {
    console.log('No value.');

    var selectedOption = defaultLayout(cols, defaultColumns[i], defaultColumns);

    valuesArray[i] = selectedOption; //Update the default value in the variable array.

    console.log('Set value of select.', docKey, selectedOption);
    document.querySelector("select[name='" + fieldId + "']").value = (selectedOption);

    //Push the updated values back to local storage.
    // var obj = items.docKey;
    // await chrome.storage.local.set({[docKey]: valuesArray}, function(r){
    // 	console.log(r);
    // });
    //chrome.storage.local.set({[docKey]:'foo'}, function(r){console.log(r)}) //sets the value of variable docKey as key with value 'foo'.
    //chrome.storage.local.set({docKey:'bar'}, function(r){console.log(r)}) //sets the literal 'docKey' as key with value 'foo'.
    //chrome.storage.local.get(docKey, function(r){console.log(r)}) //gets the value of local storage with the value of variable docKey as key.
    //chrome.storage.local.get('docKey', function(r){console.log(r)}) //gets the value of local storage with the literal value 'docKey' as key.
  }
  return selectedOption;
  //changeAction(formName, elementName);
  // };
};

var nextCol = 0; //Needs to be global so that it persists between calls.

//If the spreadsheet does not have a record in the cache,
//this function will find either the default Citable columns or the next unique column.
defaultLayout = function(cols, column, defaultColumns) {
  console.log('defaultLayout()', column, cols, defaultColumns, jQuery.inArray(column, cols));

  var findUnique = function() {
    console.log('Default column not found. Searching for next unique column.', cols.length);
    for (var i = nextCol; i < cols.length; i++) {
      if (jQuery.inArray(cols[i], defaultColumns) == -1) {
        nextCol = i + 1; //Start from the next position in the spreadsheet cols.
        return cols[i];
      }
    }
    return 'none'; //If we run out of columns return 'none'.
  };

  return jQuery.inArray(column, cols) > -1 ? column : findUnique();
};


///////////////////////////////////////////////////////
$(document).ready(function() {
  $('#outputArea').scroll(function() {
    $('#indicator').css('top', function() {
      //current position/total height*window height=percentage of window height.
      var relHeight = Math.ceil($('#outputArea').scrollTop() / $('#container').height() * ($(window).height() - 0));
      // console.log(relHeight,$('#outputArea').scrollTop(),$('#container').height(),$(window).height(),$('#outputArea').height());
      return relHeight;
    });
    //console.log( 'scroll ',$(window).scrollTop() );
    var pages = $('.page');
    //console.log($('.page').length);
    var currentPage = {
      page: 0,
      percent: 0
    };
    for (var i = 0; i < pages.length; i++) {
      //console.log(i);
      percent = percentScrolledIntoView(pages[i]);
      //console.log('% ',percent);
      if (percent > currentPage.percent) {
        currentPage.page = i + 1;
        currentPage.percent = percent;
      }
    }
    //console.log(currentPage.page,currentPage.percent);
    document.querySelector('#pageNum').innerText = currentPage.page;
  });
});

function percentScrolledIntoView(elem) {
  var docViewTop = $(window).scrollTop();
  var docViewBottom = docViewTop + $(window).height();

  var elemTop = $(elem).offset().top;
  var elemHeight = $(elem).height();
  var elemBottom = elemTop + elemHeight;

  var percent = ((((elemBottom <= docViewBottom) ? elemBottom : docViewBottom) - ((elemTop >= docViewTop) ? elemTop : docViewTop)) / elemHeight);
  //console.log(percent,'%');
  return percent;
}

//Synchonous interface for chrome.storage.local.get
function SyncChromeStorage() {}

SyncChromeStorage.prototype.get = function(key) {

  chrome.storage.local.get(key, function(r) {
    console.log('SyncChromeStorage.prototype.get', key, r, r[key]);
    return r[key];
  });
};

SyncChromeStorage.prototype.set = function(obj) {
  chrome.storage.local.set(obj, function(r) {
    return r;
  });
};

var localStor = new SyncChromeStorage();

///////////////////////////////////////////////////////////////////////////////////

var startup = function() {
  console.log('startup');

  var onStorage = function(items) {
    console.log('startup.onStorage', document.URL, items);

    /*
    try {
    	console.log('Try parsing the url');
    	docKey = parseURLParams(document.URL)['key'][0];
    	//Causes a bug where the page loaded with the key in the url parameter will always default to the original document on refresh.
    	//TODO: FIX: Scrape the docKey from the url param and store it in local storage, then reload the page without the parameter.
    	localStorage['defaultDoc'] = docKey;
    	gdocs.printDocument(null, processRowsCallback); //In printexport.js
    	gdocs.start(); //In menu.js Start the doc menu building process.
    } catch(err) {
    */
    //No document in URL, check for a default docKey stored in localStorage.
    //console.log('Error: ',err);
    var defaultDoc = items.defaultDoc; //localStorage['defaultDoc'];

    if (defaultDoc != undefined) {
      console.log('items.defaultDoc', defaultDoc);
      try {
        docKey = parseURLParams(document.URL).key[0];
        title = parseURLParams(document.URL).title[0];
      } catch (e) {
        docKey = defaultDoc.id;
        title = defaultDoc.title;
      }

      $('#selection').html('<div><span class="Droid regular">Document: </span><span id="title" class="Droid bold" name="title">' + title + '</span></div>');
      gdocs.printDocument(null, processRowsCallback); //In printexport.js
      // gdocs.start(); //Refactor getting the doc list.
    } else {
      //There is no default document set.
      //This page was loaded from the app icon and not from a document.
      console.log('Get doc from menu');
      // gdocs.start(getDocId); //Refactor getting the doc list.
    }
    /*
    }
    */
    //Initialized the layout CSS for the radio controls.
    //value, key, formName, elementName, callback
    document.getElementById('loading').addClassName(items.orientation);
    // initCheck(items.m, false, 'mForm', 'm'); //if using the template switcher
    initRadio(items.orientation, 'landscape', 'radioControls', 'pages', toggleCSS);
    initRadio(items.font, 'Droid', 'radioControls', 'font', setFontIcon);
  };
  chrome.storage.local.get(null, onStorage);
};

//Run toggleAuth when the constructor is called to kick everything off.
//stored in backgroundpage for persistance and universal access within the app.
//Inital function fired on page load.
window.onload = function() {
  /*bgPage.toggleAuth(true,function(){
  	startup();
  });*/
};
