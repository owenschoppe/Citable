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
var defaultFormat = 'bibtex';
var extensions = {
  apa: '.html',
  chicago: '.html',
  mla: '.html',
  bibtex: '.bib'
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
  // var blob = new Blob([convertHtmlToRtf(content)]);
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
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area == 'local' && changes.exportFormat){
      document.getElementById('format').value = changes.exportFormat.newValue; //If multiple export pages are in use.
      makeFile();

      //Change download button to copy button.
    }
  }); //If the user changes the select, rerender.

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
      case 'apa':
        content = exportAPA(rows);
        break;
      case 'chicago':
        content = exportChicago(rows);
        break;
      case 'mla':
        content = exportMLA(rows);
        break;
      default:
        content = exportBibtex(rows);
    }
    renderDoc(content, response.exportFormat);
  });
}

function renderDoc(citations, format) {

  extension = extensions[format];

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
  if(format == 'bibtex') {
    div.innerText = citations;
  } else {
    div.innerHTML = citations;
  }

  var title = document.createElement('div');
  title.className = 'font-medium bold m-bottom--small';
  title.innerText = docName + extension;

  var headline = document.createElement('center');
  switch(format){
    case "apa":
      headline.innerText = "References";
      break;
    case "chicago":
      headline.innerText = "Bibliography";
      break;
    case "mla":
      headline.innerText = "Works Cited";
      break;
    default:
      headline.innerText = "";
      break;
  }

  content.appendChild(title);
  content.appendChild(headline);
  content.appendChild(div);
  output.appendChild(content);
}

///////////////////////
// Utility Functions //
///////////////////////

function lastFirst(author) {
  return `${author.lastName}${author.firstName ? `, ${author.firstName}` : ``}`; //For one word names, skip the first name.
}

function firstLast(author) {
  return (`${author.firstName} ${author.lastName}`).trim();
}

function formatDate(date) {
  //format dates: `Month DD, YYYY.`
  date = splitDate(date);
  return `${toMonths(date.month, 'long')} ${date.day ? `${date.day}, ` : ``}${date.year}`;
}

function quote(string) {
  return string ? `"${string}."` : ``;
}

function emphasize(string) {
  return string ? `<em>${string}</em>` : ``;
}

function formatURL(url, protocol) {
  var ref = new URL('', url);
  var urlString = `${protocol ? `${ref.protocol}` : ``}${ref.hostname}${ref.pathname}`;
  return url ? `${urlString}.` : '';
}

function sortAlpha(a, b){
  first = a.split(' ')[0]
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`"'~()]/g,"") //Punctuation
    .replace(/<(.|\n)*?>/g,"") //HTML tags
    .trim();

  second = b.split(' ')[0]
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`"'~()]/g,"")
    .replace(/<(.|\n)*?>/g,"")
    .trim();

  console.log(first,second);
  if(first < second) { return -1; }
  if(first > second) { return 1; }
  return 0;
}

function toMonths(index, format) {
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
    ],
    mla: ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
      "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
    ]
  };

  return (format) ? months[format][index] : (index + 1);
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

// function convertHtmlToRtf(html) {
//   if (!(typeof html === "string" && html)) {
//       return null;
//   }
//
//   var tmpRichText, hasHyperlinks;
//   var richText = html;
//
//   // Singleton tags
//   richText = richText.replace(/<(?:hr)(?:\s+[^>]*)?\s*[\/]?>/ig, "{\\pard \\brdrb \\brdrs \\brdrw10 \\brsp20 \\par}\n{\\pard\\par}\n");
//   richText = richText.replace(/<(?:br)(?:\s+[^>]*)?\s*[\/]?>/ig, "{\\pard\\par}\n");
//
//   // Empty tags
//   richText = richText.replace(/<(?:p|div|section|article)(?:\s+[^>]*)?\s*[\/]>/ig, "{\\pard\\par}\n");
//   richText = richText.replace(/<(?:[^>]+)\/>/g, "");
//
//   // Hyperlinks
//   richText = richText.replace(
//       /<a(?:\s+[^>]*)?(?:\s+href=(["'])(?:javascript:void\(0?\);?|#|return false;?|void\(0?\);?|)\1)(?:\s+[^>]*)?>/ig,
//       "{{{\n");
//   tmpRichText = richText;
//   richText = richText.replace(
//       /<a(?:\s+[^>]*)?(?:\s+href=(["'])(.+)\1)(?:\s+[^>]*)?>/ig,
//       "{\\field{\\*\\fldinst{HYPERLINK\n \"$2\"\n}}{\\fldrslt{\\ul\\cf1\n");
//   hasHyperlinks = richText !== tmpRichText;
//   richText = richText.replace(/<a(?:\s+[^>]*)?>/ig, "{{{\n");
//   richText = richText.replace(/<\/a(?:\s+[^>]*)?>/ig, "\n}}}");
//
//   // Start tags
//   richText = richText.replace(/<(?:b|strong)(?:\s+[^>]*)?>/ig, "{\\b\n");
//   richText = richText.replace(/<(?:i|em)(?:\s+[^>]*)?>/ig, "{\\i\n");
//   richText = richText.replace(/<(?:u|ins)(?:\s+[^>]*)?>/ig, "{\\ul\n");
//   richText = richText.replace(/<(?:strike|del)(?:\s+[^>]*)?>/ig, "{\\strike\n");
//   richText = richText.replace(/<sup(?:\s+[^>]*)?>/ig, "{\\super\n");
//   richText = richText.replace(/<sub(?:\s+[^>]*)?>/ig, "{\\sub\n");
//   richText = richText.replace(/<(?:p|div|section|article)(?:\s+[^>]*)?>/ig, "{\\pard\n");
//
//   // End tags
//   richText = richText.replace(/<\/(?:p|div|section|article)(?:\s+[^>]*)?>/ig, "\n\n\\par}\n");
//   richText = richText.replace(/<\/(?:b|strong|i|em|u|ins|strike|del|sup|sub)(?:\s+[^>]*)?>/ig, "\n}");
//
//   // Strip any other remaining HTML tags [but leave their contents]
//   richText = richText.replace(/<(?:[^>]+)>/g, "");
//
//   // Prefix and suffix the rich text with the necessary syntax
//   richText =
//       "{\\rtf1\\ansi\n" + (hasHyperlinks ? "{\\colortbl\n;\n\\red0\\green0\\blue255;\n}\n" : "") + richText +  "\n}";
//
//   return richText;
// }
