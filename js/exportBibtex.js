/*jshint esversion: 6 */
/////////////////////////////////
//From Zotero github bibtex.js //
/////////////////////////////////
function exportBibtex({
  rows,
  splitAuthor,
  splitDate,
  toMonths
}) {

  //Zotero.write("% BibTeX export generated by Zotero "+Zotero.Utilities.getVersion());
  // to make sure the BOM gets ignored
  var str = "";

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
    var creators = splitAuthor(item.author);
    var date = splitDate(item.date);
    var year = date.year;
    var month = toMonths(date.month, "lower");
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

    if (creators && creators.length) {
      //console.log('creators ', item.creators);
      // split creators into subcategories
      var author = "";
      var editor = "";
      var translator = "";
      for (var k in creators) {
        var creator = creators[k]; //item{ creators{ creator{ firstName, lastName, creatorType } } }
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

    if (month && year) {
      //console.log('date ',item.month,item.year);
      writeField("month", month);
      writeField("year", year);
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

  return str;
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
