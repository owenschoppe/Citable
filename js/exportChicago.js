/*jshint esversion: 6 */
 function exportChicago(rows) {

  var website = function(strings, type, title, authors, dateAccessed, datePublished, url) {
    //format authors: `last, first, and first last.` sorted by last name. If >10 authors, show 7 followed by `et al.`
    //format dates: `Month DD, YYYY.`
    return `${authors}. "${title}." ${ datePublished ? `Last modified ${datePublished}` : `Accessed ${dateAccessed}`}. ${url}.`;
  };

  var formatAuthors = function(authors) {
    authors = splitAuthor(authors); //turn authors into an array of structured authors.
    authors.sort((a,b)=>{return b.lastName - a.lastName;});
    //Do these two prior to passing to this function. Store authors[0].lastName to sort all of the citations.

    stop = authors.length > 10 ? 7 : authors.length;

    function lastFirst(author) {
      return `${author.lastName}, ${author.firstName}`;
    }

    function firstLast(author) {
      return `${author.firstName} ${author.lastName}`;
    }

    function otherAuthors(authors) {
      return `${authors.map((author,index) =>
        (index > 0 && index < stop) ? `, ${(index == stop - 1) ? 'and ' : ''}${firstLast(author)}` : ``
      ).join('')}`;
    }

    return `${lastFirst(authors[0])}${authors.length > 1 ? `${otherAuthors(authors)}` : ''}`;
  };



  str += "\n";

  var first = true;
  var citekeys = {};
  //var item;
  //while(item = Zotero.nextItem()) {
  var len = rows.length;
  for (var i = 0; i < len; i++) {
    var item = rows[i];
    console.log('item ', i, item);
    // determine type
    var type = "misc";
    //var type = zotero2bibtexTypeMap[item.itemType];
    //if (typeof(type) == "function") { type = type(item); }
    //if(!type) type = "misc";
    item.creators = splitAuthor(item.author);
    var date = splitDate(item.date);
    item.year = date.year;
    item.month = toMonths(date.month,"lower");
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
