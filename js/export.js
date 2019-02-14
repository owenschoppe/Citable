/*jshint esversion: 6 */
//Crashes when the number of records is too large. or for some other reason.
//Crashes if two export windows are open at the same time.
//Crashes occasionally for unknown reasons.
//Crashes if javascript is paused at an interupt and the window is closed. Citable won't open until Chrome is restarted.

//Files persist after they are needed, ideally we remove the file after it is downloaded.

//Simplify the doExport function to handle the row data from Citable and create only web citations, 'misc'.
//For missing functions refer to Bibtex.js

var str = '';
var util = {};
var bgPage = '';
chrome.runtime.getBackgroundPage(function(ref) {
  bgPage = ref;
  bgPage.toggleAuth(true, function() {
    startup();
  });
});
var rows = [];
var docName = '';
var docKey = '';
var content = '';
var defaultFormat = 'Zotero';
var extensions = {
  apa: '.txt',
  chicago: '.txt',
  mla: '.txt',
  zotero: '.bib'
}

var SPREAD_SCOPE = 'https://spreadsheets.google.com/feeds';
var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var FULL_SCOPE = DOCLIST_SCOPE + ' ' + SPREAD_SCOPE;

//Currently export only loads if the background page succeeds in retrieving the document content. Maybe the page should load regardless and then the content is loaded. TODO.

//Pull the values from storage instead of relying on bgPage. Makes this page independent.
// chrome.storage.local.get('row', function(response) {
//   console.log("chrome.storage.sync.get('row')", response);
//   rows = response.row;
//   chrome.storage.local.get('defaultDoc', function(response) {
//     console.log("chrome.storage.sync.get('defaultDoc')", response);
//     docName = parseURLParams(document.URL).title[0] || response.defaultDoc.title;
//
//     //Start export after the content has loaded. Fix for async chrome.storage
//     makeFile();
//   });
// });

////////////////////////////////////////////////////////////////////////////////
//Listeners
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#print-button').addEventListener('click', printHandler);
  document.querySelector('#cancel-button').addEventListener('click', cancelHandler);
});

function printHandler(e) {
  chrome.storage.local.get('exportFormat', function(response) {
    console.log("chrome.storage.local.get('exportFormat')", response);
    var extension = extensions[response.exportFormat];
    _gaq.push(['_trackEvent', 'Button', 'Download '+extension]);
    saveFile(extension);
  });
  return false;
}

function cancelHandler(e) {
  _gaq.push(['_trackEvent', 'Button', 'Cancel Export']);
  window.close();
  return false;
}

function saveFile(extension) {
  /*var bb = new window.WebKitBlobBuilder();
	// Note: window.WebKitBlobBuilder in Chrome 12.
    //var content = doExport();
    bb.append(content.toString());*/

  var blob = new Blob([content.toString()]);
  saveAs(blob, docName + extension); //Uses FileSave.js
  //Is FileSave.js a future compatible option?
}

// if (bgPage.oauth.hasToken()) {
// 	//Inital function fired on page load.
// 	window.onload = function(){
// 		startup();
// 	};
// } else {
// 	console.log('hasToken == false');
// 	/////////////////////////////////////
// 	//Important for the doclist features.
// 	////////////////////////////////////
// 	bgPage.oauth.authorize(function() {
// 	   //Authorize callback.
// 	   console.log('authorize callback');
// 	   startup(); //Try restarting the page.
// 	   //util.scheduleRequest();
// 	});
// }

function startup() {
  function onStorage(items) {
    var defaultDoc = items.defaultDoc;
    if (defaultDoc != undefined) {
      try {
        docKey = parseURLParams(document.URL).key[0];
        docName = parseURLParams(document.URL).title[0];
        initSelect(items.exportFormat);
      } catch (e) {
        console.log('URL params not found.');
        docKey = defaultDoc.id;
        docName = defaultDoc.title;
      }
      console.log('localStorage["defaultDoc"] ', docName, docKey);
      gdocs.exportDocument(null, makeFile); //In printexport.js
      //gdocs.start();
    } else {
      //There is no default document set.
      //This page was loaded from the app icon and not from a document.
      console.log('Get doc from menu');
      //gdocs.start(getDocId);
    }
  }
  chrome.storage.local.get(null, onStorage);
}

function initSelect(format){
  document.getElementById('format').value = format; //Init format select menu.
  document.getElementById('format').addEventListener('change',changeSelection);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area == 'local' && changes.exportFormat){makeFile();}}); //If the user changes the select, rerender.

  function changeSelection(e) {
    chrome.storage.local.set({
      'exportFormat': e.target.value
    }, function(response) {

    });
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////
function makeFile() {
  rows = row; //from printexport.js
  chrome.storage.local.get('exportFormat', function(response) {
    console.log("chrome.storage.local.get('exportFormat')", response);
    // var content = ''; //TODO: Currently uses global variable... ick.
    switch(response.exportFormat) {
      case 'chicago':
        content = exportChicago(rows);
        break;
      default:
        content = exportZotero(rows);
    }
    renderDoc(content, extensions[response.exportFormat]);
  });
}

function renderDoc(bibtex, extension) {

  document.querySelector('#loading').classList.add('hidden'); //Hide the loading gif.

  document.title = 'Citable - ' + docName;

  var total = "<span class='Droid regular'>Document: </span><span class='Droid bold'>" + docName + "</span>";
  document.getElementById('total').innerHTML = total;

  var output = document.getElementById('output');
  output.innerHTML = ''; //Clear prior data

  var content = document.createElement('div');
  content.id = "content";
  content.className = "export";

  var div = document.createElement('div');
  div.innerText = bibtex;

  var title = document.createElement('div');
  title.className = 'font-medium bold m-bottom--small';
  title.innerText = docName + extension;

  content.appendChild(title);
  content.appendChild(div);
  output.appendChild(content);
}

//////////////////////////////////////////////////////////////////////////////////

function splitAuthor(author) {
  //item{ creators{ creator{ firstName, lastName, creatorType } } }
  var authors = author.split(";");
  authors = splitAnd(authors);

  function splitAnd(authors) {
    var author = [];
    for (var k in authors) {
      var parts = authors[k].split("and");
      for (var j in parts) {
        author.push(parts[j].trim());
      }
    }
    return author;
  }

  function splitComma(authors) {
    var author = [];
    for (var k in authors) {
      var parts = authors[k].split(",");
      for (var j in parts) {
        author.push(parts[j].trim());
      }
    }
    return author;
  }

  function getAuthors(authors) {
    var creators = [];
    for (var k = 0; k < authors.length; k++) {
      if (authors[k]) {
        var creator = {};
        parts = authors[k].split(" ");
        if (authors[k].indexOf(",") > -1) {
          //Is the author properly formatted?
          if (parts[0].indexOf(",") > -1) {
            //If the first word is not followed by a comma, then the comma means we have two different names.
            creator.lastName = parts[0].replace(",", "").trim();
            creator.firstName = parts.reduce((accumulator, item, index, array) => {
              if (index != 0) {
                accumulator.push(item);
              }
                return accumulator;
              }, []).join(" ");
          } else {
            //Authors contains a comma but it's not used correctly. Assume multiple authors.
            authors = splitComma(authors);
            return getAuthors(authors);
          }
        } else {
          //Authors aren't formatted (last, first) and also don't contain commas. Assume (first last) formatting.
          if (authors[k].indexOf(/(and)/i) > -1) {
            //should be impossible given that we already split on 'and' above.
          } else {
            creator.lastName = parts[parts.length - 1];
            //Get all other words.
            creator.firstName = parts.reduce((accumulator, item, index, array) => {
              if (index != array.length - 1) {
                accumulator.push(item);
              }
              return accumulator;
            }, []).join(" ");
          }
        }
        creator.creatorType = 'author';
        creators.push(creator);
        //console.log(creators);
      }
    }
    return creators;
  }
  return getAuthors(authors);
}

function splitDate(dateString) {
  var date = {};
  var d = new Date(dateString);
  if (d != "Invalid Date") {
    date.year = d.getFullYear();
    date.month = d.getMonth(); //Returns index for months text array.
    date.day = d.getDate();
  } else {
    date.year = "";
    date.month = "";
    date.day = "";
  }
  return date;
}

//From Zotero github bibtex.js
function exportZotero(rows) {

  //Zotero.write("% BibTeX export generated by Zotero "+Zotero.Utilities.getVersion());
  // to make sure the BOM gets ignored
  str += "";

  var first = true;
  var citekeys = {};
  //var item;
  //while(item = Zotero.nextItem()) {
  var len = rows.length;
  for (var i = 0; i < len; i++) {
    var item = rows[i];
    // console.log('item ', i, item);
    // determine type
    var type = "misc";
    //var type = zotero2bibtexTypeMap[item.itemType];
    //if (typeof(type) == "function") { type = type(item); }
    //if(!type) type = "misc";
    item.creators = splitAuthor(item.author);
    var date = splitDate(item.date);
    item.year = date.year;
    item.month = toMonths(date.month, "lower");
    // create a unique citation key
    var citekey = buildCiteKey(item, citekeys);

    // write citation key
    str += ((first ? "" : ",\n\n") + "@" + type + "{" + citekey);
    first = false;

    //No
    if (item.reportNumber || item.issue || item.seriesNumber) {
      writeField("number", item.reportNumber || item.issue || item.seriesNumber);
    }

    //No
    if (item.publicationTitle) {
      if (item.itemType == "bookSection" || item.itemType == "conferencePaper") {
        writeField("booktitle", item.publicationTitle);
      } else {
        writeField("journal", item.publicationTitle);
      }
    }

    //Perhaps in the future
    if (item.publisher) {
      if (item.itemType == "thesis") {
        writeField("school", item.publisher);
      } else if (item.itemType == "report") {
        writeField("institution", item.publisher);
      } else {
        writeField("publisher", item.publisher);
      }
    }

    if (item.title) {
      writeField("title", item.title);
    }

    //Create new author function to split by ';' and reorder by last,first
    //Result should be last,first and last,first

    if (item.creators && item.creators.length) {
      //console.log('creators ', item.creators);
      // split creators into subcategories
      var author = "";
      var editor = "";
      var translator = "";
      for (var k in item.creators) {
        var creator = item.creators[k]; //item{ creators{ creator{ firstName, lastName, creatorType } } }
        var creatorString = creator.lastName;

        if (creator.firstName) {
          creatorString = creator.lastName + ", " + creator.firstName;
        } else if (creator.fieldMode == true) { // fieldMode true, assume corporate author
          creatorString = "{" + creator.lastName + "}";
        }

        if (creator.creatorType == "editor" || creator.creatorType == "seriesEditor") {
          editor += " and " + creatorString;
        } else if (creator.creatorType == "translator") {
          translator += " and " + creatorString;
        } else {
          author += " and " + creatorString;
        }
      }

      if (author) {
        writeField("author", author.substr(5)); //Start at five to cut off the first 'and'.
      }
      if (editor) {
        writeField("editor", editor.substr(5));
      }
      if (translator) {
        writeField("translator", translator.substr(5));
      }
    }

    if (item.month && item.year) {
      //console.log('date ',item.month,item.year);
      writeField("month", item.month);
      writeField("year", item.year);
    }

    //???
    if (item.summary) {
      writeField("note", item.summary);
    }

    //Yes
    if (item.tags) {
      var tagString = "";
      var tags = item.tags.split(" "); //when updating the tag functions fix this.
      for (var l in tags) {
        tagString += ", " + tags[l];
      }
      writeField("keywords", tagString.substr(2));
    }

    //No pages.
    if (item.pages) {
      writeField("pages", item.pages.replace("-", "--"));
    }

    //Yes
    if (item.url) {
      writeField("howpublished", item.url);
    }

    str += ("\n}");
  }

  return str;
}

//Use String.concat(string, string, ...

// some fields are, in fact, macros.  If that is the case then we should not put the
// data in the braces as it will cause the macros to not expand properly
function writeField(field, value, isMacro) {
  //console.log('writeField ', field, value, isMacro);
  if (!value && typeof value != "number") return;
  value = value + ""; // convert integers to strings
  str += (",\n\t" + field + " = ");
  if (!isMacro) str += ("{");
  // url field is preserved, for use with \href and \url
  // Other fields (DOI?) may need similar treatment
  str += (value);
  if (!isMacro) str += ("}");
}

function mapEscape(character) {
  //console.log('mapEscape');
  return alwaysMap[character];
}

//If the data is UTF-8 encoded, which web data will never be.
/*function mapAccent(character) {
	return (mappingTable[character] ? mappingTable[character] : "?");
}*/

// a little substitution function for BibTeX keys, where we don't want LaTeX
// escaping, but we do want to preserve the base characters

function tidyAccents(s) {
  //console.log('tidyAccents');
  var r = s.toLowerCase();

  // XXX Remove conditional when we drop Zotero 2.1.x support
  // This is supported in Zotero 3.0 and higher
  /*if (ZU.removeDiacritics !== undefined)
  	r = ZU.removeDiacritics(r, true);
  else {*/
  // We fall back on the replacement list we used previously
  r = r.replace(new RegExp("[ä]", 'g'), "ae");
  r = r.replace(new RegExp("[ö]", 'g'), "oe");
  r = r.replace(new RegExp("[ü]", 'g'), "ue");
  r = r.replace(new RegExp("[àáâãå]", 'g'), "a");
  r = r.replace(new RegExp("æ", 'g'), "ae");
  r = r.replace(new RegExp("ç", 'g'), "c");
  r = r.replace(new RegExp("[èéêë]", 'g'), "e");
  r = r.replace(new RegExp("[ìíîï]", 'g'), "i");
  r = r.replace(new RegExp("ñ", 'g'), "n");
  r = r.replace(new RegExp("[òóôõ]", 'g'), "o");
  r = r.replace(new RegExp("œ", 'g'), "oe");
  r = r.replace(new RegExp("[ùúû]", 'g'), "u");
  r = r.replace(new RegExp("[ýÿ]", 'g'), "y");
  //}

  return r;
}

var numberRe = /^[0-9]+/;
// Below is a list of words that should not appear as part of the citation key
// in includes the indefinite articles of English, German, French and Spanish, as well as a small set of English prepositions whose
// force is more grammatical than lexical, i.e. which are likely to strike many as 'insignificant'.
// The assumption is that most who want a title word in their key would prefer the first word of significance.
var citeKeyTitleBannedRe = /\b(a|an|the|some|from|on|in|to|of|do|with|der|die|das|ein|eine|einer|eines|einem|einen|un|une|la|le|l\'|el|las|los|al|uno|una|unos|unas|de|des|del|d\')(\s+|\b)/g;
var citeKeyConversionsRe = /%([a-zA-Z])/;
var citeKeyCleanRe = /[^a-z0-9\!\$\&\*\+\-\.\/\:\;\<\>\?\[\]\^\_\`\|]+/g;

var citeKeyConversions = {
  "a": function(flags, item) {
    if (item.creators && item.creators[0] && item.creators[0].lastName) {
      return item.creators[0].lastName.toLowerCase().replace(/ /g, "_").replace(/,/g, "");
    }
    return "";
  },
  "t": function(flags, item) {
    if (item.title) {
      return item.title.toLowerCase().replace(citeKeyTitleBannedRe, "").split(/\s+/g)[0];
    }
    return "";
  },
  "y": function(flags, item) {
    if (item.year) {
      //var date = Zotero.Utilities.strToDate(item.date);
      if (item.year && numberRe.test(item.year)) {
        return item.year;
      }
    }
    return "????";
  }
};

function buildCiteKey(item, citekeys) {
  //console.log('buildCiteKey');
  //%a = first author surname
  //%y = year
  //%t = first word of title
  var citeKeyFormat = "%a_%t_%y";

  var basekey = "";
  var counter = 0;
  citeKeyFormatRemaining = citeKeyFormat;
  while (citeKeyConversionsRe.test(citeKeyFormatRemaining)) {
    if (counter > 100) {
      console.log("Pathological BibTeX format: " + citeKeyFormat);
      break;
    }
    var m = citeKeyFormatRemaining.match(citeKeyConversionsRe);
    if (m.index > 0) {
      //add data before the conversion match to basekey
      basekey = basekey + citeKeyFormatRemaining.substr(0, m.index);
    }
    var flags = ""; // for now
    var f = citeKeyConversions[m[1]];
    if (typeof(f) == "function") {
      var value = f(flags, item);
      //console.log("Got value " + value + " for %" + m[1]);
      //add conversion to basekey
      basekey = basekey + value;
    }
    citeKeyFormatRemaining = citeKeyFormatRemaining.substr(m.index + m.length);
    counter++;
  }
  if (citeKeyFormatRemaining.length > 0) {
    basekey = basekey + citeKeyFormatRemaining;
  }

  // for now, remove any characters not explicitly known to be allowed;
  // we might want to allow UTF-8 citation keys in the future, depending
  // on implementation support.
  //
  // no matter what, we want to make sure we exclude
  // " # % ' ( ) , = { } ~ and backslash
  // however, we want to keep the base characters

  basekey = tidyAccents(basekey);
  basekey = basekey.replace(citeKeyCleanRe, "");
  var citekey = basekey;
  var k = 0;
  while (citekeys[citekey]) {
    k++;
    citekey = basekey + "-" + k; //Marks duplicate citekeys with a number.
  }
  citekeys[citekey] = true;
  return citekey;
}

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

/*
 * three-letter month abbreviations. i assume these are the same ones that the
 * docs say are defined in some appendix of the LaTeX book. (i don't have the
 * LaTeX book.)
 */
var months = {
  lower: ["jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
  ],
  short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ],
  long: ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
};

function toMonths(index, format) {
  return (format) ? months[format][index] : (index + 1);
}
