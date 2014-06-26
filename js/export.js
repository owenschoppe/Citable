//Crashes when the number of records is too large. or for some other reason.
//Crashes if two export windows are open at the same time.
//Crashes occasionally for unknown reasons.
//Crashes if a javascript is paused at an interupt and the window is closed. Citable won't open until Chrome is restarted.

//Files persist after they are needed, ideally we remove the file after it is downloaded.

//Simplify the doExport function to handle the row data from Citable and create only web citations, 'misc'. 
//For missing functions refer to Bibtex.js

var str = '';
var util = {};
var bgPage = chrome.extension.getBackgroundPage();
var rows = bgPage.row;
var docName = bgPage.docName;
var content = '';

////////////////////////////////////////////////////////////////////////////////
//Listeners
document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('#print-button').addEventListener('click', printHandler);
  document.querySelector('#cancel-button').addEventListener('click', cancelHandler);
});

function printHandler(e) {
	_gaq.push(['_trackEvent', 'Button', 'Download .bib']);
	saveFile();
	return false;
}

function cancelHandler(e) {
	_gaq.push(['_trackEvent', 'Button', 'Cancel Export']);
	window.close();
	return false;
}

window.onload = function(){
	makeFile();
}

////////////////////////////////////////////////////////////////////////////////
//Error handler
function errorHandler(e) {
  var msg = '';
  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  util.displayError(msg);
}

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

/////////////////////////////////////////////////////////////////////////////////////////////

function saveFile() {
	/*var bb = new window.WebKitBlobBuilder(); 
	// Note: window.WebKitBlobBuilder in Chrome 12.
    //var content = doExport();
    bb.append(content.toString());*/
    
    var blob = new Blob([content.toString()]);

    saveAs(blob, docName+".bib"); //Uses FileSave.js
    //Is FileSave.js a future compatible option?
}

function renderDoc(bibtex){

		document.title = 'Citable - '+docName;
		
		var total = "<span class='Droid regular'>Exporting: </span><span class='Myriad bold'>"+docName+"</span>";
		document.getElementById('total').innerHTML = total;
		
		
		var output = document.getElementById('output');
		output.className = "offset";
		
		var content = document.createElement('div');
		content.id = "content";
		
		var div = document.createElement('div');
		div.className = "export";
		div.innerText = bibtex;
		
		var title = document.createElement('div');
		title.className = 'doc_title bold';
		title.innerText = docName+'.bib';

        content.appendChild(title);
        content.appendChild(div);
		output.appendChild(content);
		//$('#output').replaceWith(content);
}

//Call function from button.
function makeFile(){
		//saveFile();
		content = doExport();
		renderDoc(content);
}

//////////////////////////////////////////////////////////////////////////////////

function splitAuthor(author){
	//item{ creators{ creator{ firstName, lastName, creatorType } } }
	var creators = new Array();
	var authors = author.split(";")
	authors = splitAnd(authors);
	
	function splitAnd(authors){
		var author = new Array(); 
		for(var k in authors){ 
			var parts = authors[k].split("and"); 
			for(var j in parts){
				author.push(parts[j].trim());
			}
		}
		return author;
	};
	//console.log('splitAuthor ',authors);
	for( var k=0; k<authors.length; k++){
		if(authors[k]){
			//console.log('comma search ',authors[k].indexOf(","));
			var creator = new Array();
			parts = authors[k].split(" ");
			if(authors[k].indexOf(",")>-1){ //Is the author properly formatted?
				creator['lastName'] = parts[0].replace(",","").trim();
				creator['firstName'] = parts[1]+String(parts.length == 3 ? (" "+parts[2]) :""); //Assumes 3 name parts max. Not a reasonable assumption but acceptable for now.
			} else {
				//console.log('no comma found: ',parts,authors[k].indexOf(/(and)/i) );
				if(authors[k].indexOf(/(and)/i)>-1){
					
				} else {
					creator['lastName'] = parts[parts.length-1];
					creator['firstName'] = parts[0]+String(parts.length == 3 ? (" "+parts[1]) :""); 
				}
			}
			creator['creatorType'] = 'author';
			creators.push(creator);
			//console.log(creators);
		}
	}
	return creators;
}

function splitDate(dateString){
	//console.log('splitDate ', dateString);
	var date = new Array();
	var parts = dateString.split('/');
	//console.log('parts ',parts);
	// need to use non-localized abbreviation
	if(parts[0]) {
		date["month"] = months[parseInt(parts[0])-1];
		//console.log('month ',date["month"],parseInt(parts[0])-1);
	}
	if(parts[2]) {
		date["year"] = parseInt(parts[2]);
		//console.log('year ',date["year"],parseInt(parts[2]));
	}
	return date;
}

//From Zotero github bibtex.js 
function doExport() {
	
	//Zotero.write("% BibTeX export generated by Zotero "+Zotero.Utilities.getVersion());
	// to make sure the BOM gets ignored
	str+="\n";
	
	var first = true;
	var citekeys = new Object();
	//var item;
	//while(item = Zotero.nextItem()) {
	var len=rows.length;
	for (var i=0; i<len; i++) {
		var item=rows[i];
		console.log('item ',i,item);
		// determine type
		var type = "misc";
		//var type = zotero2bibtexTypeMap[item.itemType];
		//if (typeof(type) == "function") { type = type(item); }
		//if(!type) type = "misc";
		item['creators'] = splitAuthor(item.author);
		var date = splitDate(item.date);
		item['year'] = date.year;
		item['month'] = date.month;
		// create a unique citation key
		var citekey = buildCiteKey(item, citekeys);
		
		// write citation key
		str+=((first ? "" : ",\n\n")+"@"+type+"{"+citekey);
		first = false;

		//No
		if(item.reportNumber || item.issue || item.seriesNumber) {
			writeField("number", item.reportNumber || item.issue || item.seriesNumber);
		}

		//No
		if(item.publicationTitle) {
			if(item.itemType == "bookSection" || item.itemType == "conferencePaper") {
				writeField("booktitle", item.publicationTitle);
			} else {
				writeField("journal", item.publicationTitle);
			}
		}
		
		//Perhaps in the future
		if(item.publisher) {
			if(item.itemType == "thesis") {
				writeField("school", item.publisher);
			} else if(item.itemType =="report") {
				writeField("institution", item.publisher);
			} else {
				writeField("publisher", item.publisher);
			}
		}
		
		if(item.title) {
			writeField("title", item.title);
		}
		
		//Create new author function to split by ';' and reorder by last,first
		//Result should be last,first and last,first
		
		if(item.creators && item.creators.length) {
			//console.log('creators ', item.creators);
			// split creators into subcategories
			var author = "";
			var editor = "";
			var translator = "";
			for(var k in item.creators) {
				var creator = item.creators[k]; //item{ creators{ creator{ firstName, lastName, creatorType } } }
				var creatorString = creator.lastName;

				if (creator.firstName) {
					creatorString = creator.lastName + ", " + creator.firstName;
				} else if (creator.fieldMode == true) { // fieldMode true, assume corporate author
					creatorString = "{" + creator.lastName + "}";
				}

				if (creator.creatorType == "editor" || creator.creatorType == "seriesEditor") {
					editor += " and "+creatorString;
				} else if (creator.creatorType == "translator") {
					translator += " and "+creatorString;
				} else {
					author += " and "+creatorString;
				}
			}
			
			if(author) {
				writeField("author", author.substr(5)); //Start at five to cut off the first 'and'.
			}
			if(editor) {
				writeField("editor", editor.substr(5));
			}
			if(translator) {
				writeField("translator", translator.substr(5));
			}
		}

		if(item.month && item.year){
			//console.log('date ',item.month,item.year);
			writeField("month", item.month);
			writeField("year", item.year);
		}
		
		//???
		if(item.summary) {
			writeField("note", item.summary);
		}
		
		//Yes
		if(item.tags) {
			var tagString = "";
			var tags = item.tags.split(" "); //when updating the tag functions fix this.
			for(var k in tags) {
				tagString += ", "+tags[k];
			}
			writeField("keywords", tagString.substr(2));
		}
		
		//No pages.
		if(item.pages) {
			writeField("pages", item.pages.replace("-","--"));
		}
		
		//Yes
		if(item.url) {
			writeField("howpublished", item.url);
		}
		
		str+=("\n}");
	}

	return str;
}

//Use string.concat(string, string, ...

// some fields are, in fact, macros.  If that is the case then we should not put the
// data in the braces as it will cause the macros to not expand properly
function writeField(field, value, isMacro) {
	//console.log('writeField ', field, value, isMacro);
	if(!value && typeof value != "number") return;
	value = value + ""; // convert integers to strings
	str+=(",\n\t"+field+" = ");
	if(!isMacro) str+=("{");
	// url field is preserved, for use with \href and \url
	// Other fields (DOI?) may need similar treatment
	str+=(value);
	if(!isMacro) str+=("}");
}

function mapEscape(character) {
	//console.log('mapEscape');
	return alwaysMap[character];
}

//If the data is UTF-8 encoded, which web data will never be.
/*function mapAccent(character) {
	return (mappingTable[character] ? mappingTable[character] : "?");
}*/

/*
 * three-letter month abbreviations. i assume these are the same ones that the
 * docs say are defined in some appendix of the LaTeX book. (i don't have the
 * LaTeX book.)
 */
var months = ["jan", "feb", "mar", "apr", "may", "jun",
			  "jul", "aug", "sep", "oct", "nov", "dec"];

// a little substitution function for BibTeX keys, where we don't want LaTeX 
// escaping, but we do want to preserve the base characters

function tidyAccents(s) {
	//console.log('tidyAccents');
	var r=s.toLowerCase();

	// XXX Remove conditional when we drop Zotero 2.1.x support
	// This is supported in Zotero 3.0 and higher
	/*if (ZU.removeDiacritics !== undefined)
		r = ZU.removeDiacritics(r, true);
	else {*/
	// We fall back on the replacement list we used previously
		r = r.replace(new RegExp("[ä]", 'g'),"ae");
		r = r.replace(new RegExp("[ö]", 'g'),"oe");
		r = r.replace(new RegExp("[ü]", 'g'),"ue");
		r = r.replace(new RegExp("[àáâãå]", 'g'),"a");
		r = r.replace(new RegExp("æ", 'g'),"ae");
		r = r.replace(new RegExp("ç", 'g'),"c");
		r = r.replace(new RegExp("[èéêë]", 'g'),"e");
		r = r.replace(new RegExp("[ìíîï]", 'g'),"i");
		r = r.replace(new RegExp("ñ", 'g'),"n");                            
		r = r.replace(new RegExp("[òóôõ]", 'g'),"o");
		r = r.replace(new RegExp("œ", 'g'),"oe");
		r = r.replace(new RegExp("[ùúû]", 'g'),"u");
		r = r.replace(new RegExp("[ýÿ]", 'g'),"y");
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
	"a":function (flags, item) {
		if(item.creators && item.creators[0] && item.creators[0].lastName) {
			return item.creators[0].lastName.toLowerCase().replace(/ /g,"_").replace(/,/g,"");
		}
		return "";
	},
	"t":function (flags, item) {
		if (item["title"]) {
			return item["title"].toLowerCase().replace(citeKeyTitleBannedRe, "").split(/\s+/g)[0];
		}
		return "";
	},
	"y":function (flags, item) {
		if(item.year) {
			//var date = Zotero.Utilities.strToDate(item.date);
			if(item.year && numberRe.test(item.year)) {
				return item.year;
			}
		}
		return "????";
	}
};

//%a = first author surname
//%y = year
//%t = first word of title
var citeKeyFormat = "%a_%t_%y";

function buildCiteKey(item,citekeys) {
	//console.log('buildCiteKey');
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
	while(citekeys[citekey]) {
		k++;
		citekey = basekey + "-" + k; //Marks duplicate citekeys with a number.
	}
	citekeys[citekey] = true;
	return citekey;
};