console.log('content_script');

var getSelectedText = function() {
  // Function: finds selected text on document d.
  // @return the selected text or null
  function f(d) {
    var t;
    //Check for a regular selection.
    if (d.getSelection) t = d.getSelection();
    //Check for a range selection.
    else if (d.selection) t = d.selection.createRange();
    if (t.text != undefined) t = t.text;
    //Check text areas for selection.
    if (!t || t == '') {
      var a = d.getElementsByTagName('textarea');
      for (var i = 0; i < a.length; ++i) {
        if (a[i].selectionStart != undefined && a[i].selectionStart != a[i].selectionEnd) {
          t = a[i].value.substring(a[i].selectionStart, a[i].selectionEnd);
          break;
        }
      }
    }
    return t;
  }
  // Function: finds selected text in document d and frames and subframes of d
  // @return the selected text or null
  function g(d) {
    var t = '';
    try {
      t = f(d);
    } catch (e) {
      console.log('ERROR: ', e);
    }
    if ((!t || t == '') && d) {
      var docs = [];
      //Add all frames to the doc list.
      var fs = d.getElementsByTagName('frame');
      for (var i = 0; i < fs.length; ++i) {
        docs.push(fs[i]);
      }
      //Add all the iframes to the doc list.
      fs = d.getElementsByTagName('iframe');
      for (var j = 0; j < fs.length; ++j) {
        docs.push(fs[j]);
      }
      //Iterate through all the docs looking for selected text.
      for (var k = 0; k < docs.length; ++k) {
        t = g(docs[k].contentDocument);
        if (t && t.toString() != '') break;
      }
    }
    return t;
  }
  //Initiate the search using the top document.
  var t = g(document);
  //Return the results.
  if (!t || t == '') return ''; //Nothing found.
  else return t.toString(); //Returns selected text.
};

var getAuthor = function() {

  var stringAuthors = function(a) {
    //console.log('stringAuthors ',a);
    var authors = '';
    for (var i = 0; i < a.length; i++) {
      console.log('author', i, ': ', a[i]);
      authors += $(a[i]).text();
      authors += (i < (a.length - 1) ? '; ' : '');
    }
    console.log('authors: ', authors);
    return authors;
  };

  var parseAuthor = function(author) {
    if (author) {
      console.log('parse', author);
      //Parses out just the author's name. Perhaps including the date of publishing and the authors official title would be good.
      var re6 = '(?:(?!and)\\b[a-z]+\\s|[0-9])'; // First lower case word that isn't 'and' and is followed by a space or number
      var p = new RegExp(re6, ["g"]);
      var m = p.exec(author);

      var re4 = '(?:\\bBy\\b)'; //Non-case senstitive word 'by'
      var q = new RegExp(re4, ["i"]);

      var re7 = '(?:\\s+)';
      var r = new RegExp(re7, ["g"]);

      //console.log(author.search("\\bBy\\b","i"),(m?author.indexOf(m):author.length),author);
      //console.log(author.search(q),(m?author.indexOf(m):author.length),author);
      var loc = author.search(q); //Location of 'by'.
      //console.log(author,loc,author.indexOf(m));
      if ((loc < (m ? author.indexOf(m) : author.length) && loc != -1) || (loc == 0)) {
        console.log('split');
        author = author.slice(loc + 2);
      } //If location of 'by' is the first word or is before the first lowercase word or the end, trim off everything before by.
      //console.log(author,author.indexOf(m));
      //author = author.slice(0,(m?author.indexOf(m):author.length));
      //console.log(author);
      author = (author != '' ? $.trim(author) : '');
      //var r = author.search("\\n");
      //author = author.slice(0,(r!=-1?r:author.length)); //Clear any lines after the first line.
      author = author.replace(r, ' ').replace(/\,{2,}/g, ',');

      return author.toString();
    }
    return '';
  };

  function stringifyElements(elements) {
    return stringifyAuthors(elements.map(element => element
        .innerText) //map them to text and only take the text before the return character
      .filter(element => element)); //filter out blank text
  }

  function stringifyAuthors(authors) {
    return authors.map(author => author
        .split("\n")[0]
        .split(/\b(?:and)\b/gi) //non-capture group to find 'and' surrounded by breaks and discard them
        .map(element => element.trim())
        .join(', ')
        .replace(/\s{1,}\,/g, ',') //remove whitespace before commas
        .replace(/\,{2,}/g, ',') //remove repreating commas
        .replace(/\s{2,}/g, '') //remove repeating whitespace
        .trim()
        .replace(/,+$/, "")) //map them to text and only take the text before the return character
      .join(', ');
  }

  function getRelatedAuthors(element, selector, visibility) {
    let parent = element; //should walk up from the selection...instead of the element.
    let relatives = [];
    let siblings = [];

    while (parent != document.body && relatives.length <= 0 && siblings.length <= 1) {
      // console.log('parent:',parent);
      parent = parent.parentNode; //Move up one level.
      relatives = parent.querySelectorAll('h1'); //Is there a related H1?
      siblings = [].slice.call(parent.querySelectorAll(selector))
        .filter(element => {
          return (visibility ? element.getBoundingClientRect().height > 1 : true) && element.innerText; //Element must be visible and not blank.
        }); //Will always at least contain the element.
    }
    // console.log(selector,element,parent,relatives,siblings);
    return {
      parent: parent,
      relatives: relatives,
      siblings: siblings
    };
  }

  function filterDescendants(array) {
    return array.filter((element, i) => {
      let leaf = true;
      for (var j = i + 1; j < array.length; j++) { //Compare with all following elements.
        leaf =
          array[j].compareDocumentPosition(array[i]) & Node.DOCUMENT_POSITION_CONTAINS ||
          array[j] === array[i] ?
          false :
          leaf; //OR use array[i].contains(array[j])
      }
      return leaf;
    });
  }

  function dedupe(array) {
    return [...new Set(array)];
  }

  function findAuthors(selector, selectionElement) {
    //if selection elements
    //return getRelatedAuthors(selectionElement,selector) try various

    //else
    //For each found element, turn it into an array of it's visible sibling authors, filter out null arrays, return the first
    let authors = [].slice.call(document.querySelectorAll(selector))
      .map(element => getRelatedAuthors(element, selector, (element.getBoundingClientRect().height > 1 ? true : false)).siblings)
      .filter(element => element.length) //filter out empty arrays
      .map(array => filterDescendants(array)); //filter out parents from arrays
    authors = stringifyElements(authors[0]); //take first non-empty array of authors

    // console.log('authors text',authors);
    return authors;
  }

  var authors = [];

  selectors = [
    '[rel*="author"]', //Huffington, Wired, WSJ, LA TImes, SF Chronicle
    '[itemprop*="author"]', //Atlantic, NYT, SciAm
    '.author', //Bloomberg
    '.byline', //WSJ, NYT, Tribune, New Yorker, NPR, Associated Press
    '.author-wrapper', //Washington Post
    '[data-trackable="author"]', //Financial Times
    '.EnArticleName', //Asahi Shinbum
    'cite', //Fast Company
    '.top-authors [data-ga-track*="byline"]', //Forbes
    '.elevateCover .postMetaInline--author, .js-postMetaLockup a:not(.avatar)', //Medium
    '.article-topper__meta-item a' //Technology Review
    //Discover Mag, Politico, Bangor Daily, NBC, Fox
  ];

  try {
    authors.push(findAuthors(selectors.join()));
  } catch (e) {
    authors.push("");
    console.log('findAuthors combined', e);
  }

  //Google Books
  try {
    authors.push(document.querySelector('.addmd').innerText);
  } catch (e) {
    authors.push("");
    console.log('.addmd', e);
  }

  function getJsonLd() {
    //Fox, Bloomberg, Medium, not(Wired)
    return [].slice.call(document.querySelectorAll('[type="application/ld+json"]'))
    .filter((element)=>{return JSON.parse(element.innerText).author ? true : false})
    .reduce((result,element)=>{
      let author = JSON.parse(element.innerText).author;
      if (author instanceof Array){
        //Multiple authors @type=person, spread result
        result.push(...author.map(person => person.hasOwnProperty('name') ? person.name.toString() : person));
      } else if (author.hasOwnProperty('name')) {
        //Single author @type=person
        result.push(author.name.toString());
      } else {
        //Invalid author === string
        result.push(author);
      }
      return result;
    },[]);
  }

  function getDataAuthor() {
    //Wall Street Journal
    return [].slice.call(document.querySelectorAll("[data-scrim]"))
    .map((element)=>{
      let data = JSON.parse(element.dataset.scrim);
      if(data.type == "author"){
        return data.header;
      }
      else {
        return null;
      }
    });
  }

  function getMicrodataAuthor() {
    //Politico, NYT, not(Atlantic sometimes, take first and find siblings...)
    return dedupe(
      [].slice.call(document.querySelectorAll('[itemtype*="Article"] [itemprop*="author"] [itemprop*="name"]'))
        .map(element => element.content || element.innerText)
    );
  }

  function getRDFaAuthor() {
    //coffeecode
    return [].slice.call(document.querySelectorAll('[property*="author"] [property*="name"]'))
    .map(element => element.innerText);
  }

  function getDataPropAuthor() {
    //Washington Post
    return [].slice.call(document.querySelectorAll('[itemprop*="article"] [data-authorname]'))
    .map(element => element.dataset.authorname);
  }

  function structuredAuthor() {
    try {
      console.log('structured', getJsonLd(), getDataAuthor(), getMicrodataAuthor(), getRDFaAuthor(), getDataPropAuthor());
      return stringifyAuthors([getJsonLd(), getDataAuthor(), getMicrodataAuthor(), getRDFaAuthor(), getDataPropAuthor()].sort((a,b)=>{return b.length - a.length})[0]); //Schema.org
    } catch (e) {
      return null;
    }
  }

  //Get smarter about selecting which one.
  //Filter out empty entries in the array created by joining an empty array.
  var author = structuredAuthor() || authors.filter(element => element)[0];
  console.log('author', author, 'structured:',structuredAuthor(), 'authors:',authors);

  return parseAuthor(author); //Buggy but works 80% of the time.
};

var getDatePublished = function() {
  new Date(document.querySelectorAll('[itemprop="datePublished"], [property*="published"]')[0].content).toDateString();
  new Date(JSON.parse(document.querySelectorAll('[type="application/ld+json"]')[0].innerText).dateCreated).toDateString();
}

// Object to hold information about the current page
var author;
var summary;
var tags;

//Works for Vimeo, YouTube, HTML5 video, video.js, mediaelement.js, sublime
videoTime = function() {
  var videos = document.getElementsByTagName('video');
  var time = null;
  console.log("videos:", videos);
  for (var i = 0; i < videos.length; i++) {
    //console.log("video:",videos[i],videos[i].currentTime);
    //videos[i].addEventListener("timeupdate",updateTags,false);
    if (videos[i].currentTime > 0) {
      time = videos[i].currentTime;
    }
  }
  console.log("video time:", time);
  var totalSec = Math.round(time);
  var hours = parseInt(totalSec / 3600) % 24;
  var minutes = parseInt(totalSec / 60) % 60;
  var seconds = totalSec % 60;
  var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

  return time > 0 ? result : null;
};

try {
  author = getAuthor();
} catch (e) {
  console.log('No author', e);
}

try {
  summary = getSelectedText();
} catch (e) {
  console.log(e);
}

try {
  tags = videoTime();
} catch (e) {
  console.log(e);
}

var pageInfo = {
  "title": document.title,
  "url": 'test',
  "summary": summary,
  "authorName": author,
  "tags": tags,
};

console.log('page info: ', pageInfo);

chrome.extension.connect().postMessage(pageInfo);
