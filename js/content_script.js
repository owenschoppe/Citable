/*jshint esversion: 6 */
(function() {
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
  else return t.toString().trim(); //Returns selected text.
};

var getAuthor = function() {

  // var stringAuthors = function(a) {
  //   //console.log('stringAuthors ',a);
  //   var authors = '';
  //   for (var i = 0; i < a.length; i++) {
  //     console.log('author', i, ': ', a[i]);
  //     authors += $(a[i]).text();
  //     authors += (i < (a.length - 1) ? '; ' : '');
  //   }
  //   console.log('authors: ', authors);
  //   return authors;
  // };

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
        // console.log('split');
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
        .join('; ')
        .replace(/\s{1,}\,/g, ',') //remove whitespace before commas
        .replace(/\,{2,}/g, ',') //remove repreating commas
        .replace(/\s{2,}/g, ' ') //remove repeating whitespace
        .trim()
        .replace(/,+$/, "")) //map them to text and only take the text before the return character
      .join('; ');
  }

  function getRelatedAuthors(startElement, selector, visibility) {
    let parent = startElement; //should walk up from the selection...instead of the element.
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
    '.article-topper__meta-item a', //Technology Review
    '.highwire-citation-author', //JNeurosci
    '.addmd' //Google Books
    //Discover Mag, Politico, Bangor Daily, NBC, Fox
  ];

  function findAuthors(selector, selectionElement) {
    var authors = [];
    //if selection elements
    //return getRelatedAuthors(selectionElement,selector) try various

    //else
    //For each found element, turn it into an array of it's visible sibling authors, filter out null arrays, return the first
    try {
      authors.push(
        stringifyElements(
          [].slice.call(document.querySelectorAll(selector))
            .map(element => getRelatedAuthors(element, selector, (element.getBoundingClientRect().height > 1 ? true : false)).siblings)
            .filter(element => element.length) //filter out empty arrays
            .map(array => filterDescendants(array))[0]//Take the first non-empty array
          )
        ); //filter out parents from arrays
    } catch (e) {
      authors.push("");
      console.log('findAuthors combined', e);
    }
    console.log('unstructured:',authors);
    return authors[0]; //take first non-empty array of authors
  }

  let structuredSelectors = [
    {
      //ld+JSON
      //Fox, Bloomberg, Medium, not(Wired)
      selector: '[type="application/ld+json"]',
      parser: function(array){
        return array.filter((element)=>{return JSON.parse(element.innerText).author ? true : false;})
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
    },
    {
      //DublinCore
      //Science, New England Journal of Medicine, Google Scholar
      selector: '[name="dc.creator"], [name="DC.creator"], [name="dc.Creator"], [name="citation_author"]',
      parser: function(array){
        return array.map(element => element.content);
      }
    },
    {
      //Microdata
      //Politico, NYT, not(Atlantic sometimes, take first and find siblings...)
      selector: '[itemtype*="Article"] [itemprop*="author"] [itemprop*="name"]',
      parser: function(array){
        return array.map(element => element.content || element.innerText);
      }
    },
    {
      //RDFa
      //Coffeecode
      selector: '[property*="author"] [property*="name"]',
      parser: function(array){
        return array.map(element => element.innerText);
      }
    },
    {
      //DataProp
      //Washington Post
      selector: '[itemprop*="article"] [data-authorname]',
      parser: function(array){
        return array.map(element => element.innerText);
      }
    },
    {
      //data-scrim
      //Wall Street Journal
      selector: '[data-scrim]',
      parser: function(array){
        return array.map((element)=>{
          let data = JSON.parse(element.dataset.scrim);
          if(data.type == "author"){
            return data.header;
          }
          else {
            return null;
          }
        });
      }
    },
    {
      //meta tag
      //Chicago Tribune, Science Mag
      selector: '[name="author"], [name="news_authors"]',
      parser: function(array){
        return array.map(element => element.content);
      }
    }
  ];

  function getStructuredAuthor(selectors){
    let authors = [];
    for( var selector of selectors) {
      try {
        authors.push(
          dedupe(
            selector.parser(
              [].slice.call(
                document.querySelectorAll(selector.selector)
              )
            )
          )
        );
      } catch (e) {
        console.log(selector.selector,e);
        return null;
      }
    }
    console.log('structured:',authors);
    return stringifyAuthors(authors.sort((a,b)=>{return b.length - a.length;})[0]); //Schema.org
  }

  //Get smarter about selecting which one.
  //Filter out empty entries in the array created by joining an empty array.
  var author = getStructuredAuthor(structuredSelectors);
  if(!author) {
    author = findAuthors(selectors.join());
  }
  console.log('author', author);

  return parseAuthor(author); //Buggy but works 80% of the time.
};

function getDatePublished() {
  var selectors = [
    {
      //ld+json
      //https://schema.org/
      selector: '[type="application/ld+json"]',
      parser: function(array){
        return array.filter((element)=>{return JSON.parse(element.innerText).datePublished ? true : false;})
        .reduce((result,element)=>{
          let date = JSON.parse(element.innerText).datePublished;
          if (date instanceof Array){
            //Multiple dates, just take the first one
            result.push(date[0]);
          } else {
            //Invalid author === string
            result.push(date);
          }
          return result;
        },[]);
      }
    },
    {
      //Microdata
      //https://schema.org/
      selector: '[itemprop="datePublished"], [property*="published"]',
      parser: function(array) {
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //DublinCore
      //http://dublincore.org/documents/usageguide/#html
      selector: '[name="dc.issued"], [name="DC.issued"], [name="dc.Issued"], [name="dc.date"], [name="DC.date"], [name="dc.Date"], [name="dc.date.issued"]',
      parser: function(array) {
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Google Scholar
      //https://scholar.google.com/intl/en/scholar/inclusion.html#indexing
      selector: '[name="citation_publication"], [name="citation_publication_date"], [name="citation_date"]',
      parser: function(array) {
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Meta tag
      //https://www.w3schools.com/tags/tag_meta.asp
      //NPR, Chicago Tribune
      selector: 'meta[name="date"]',
      parser: function(array) {
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //PRISM
      //https://www.idealliance.org/prism-metadata
      selector: '[name="prism:coverDate"], [name="prism:publicationDate"]',
      parser: function(array) {
        return array.map(element => element.getAttribute("content"));
      }
    }
  ];

  let dates = [];
  for( var selector of selectors) {
    try {
      dates.push(
          ...selector.parser(
            [].slice.call(
              document.querySelectorAll(selector.selector)
            )
          )
        );
    } catch (e) {
      console.log(selector.selector,e);
      return null;
    }
  }
  console.log('structured dates:',dates,dates.filter(element => element)[0]);
  let date = new Date(dates.filter(element => element)[0]).toUTCString(); //Schema.org
  return date == "Invalid Date" ? "" : date;
}

function getTitle() {
  var selectors = [
    {
      //ld+JSON
      //https://jsonld.com/article/
      //Fox, Bloomberg, Medium, not(Wired)
      selector: '[type="application/ld+json"]',
      parser: function(array){
        return array.filter((element)=>{return JSON.parse(element.innerText).headline ? true : false;})
        .reduce((result,element)=>{
          let headline = JSON.parse(element.innerText).headline;
          result.push(headline);
          // console.log('json',result);
          return result;
        },[]);
      }
    },
    {
      //Microdata
      //https://schema.org/
      selector: '[itemtype="http://schema.org/Report"] > [itemprop="name"], [itemtype="http://schema.org/ScholarlyArticle"] > [itemprop="name"], [itemtype="http://schema.org/NewsArticle"] > [itemprop="name"], [itemtype="http://schema.org/TechArticle"] > [itemprop="name"]',
      parser: function(array) {
        return array.map(element => {
          if (element.getAttribute("content")){
            // console.log('Microdata',element.getAttribute("content"));
            return element.getAttribute("content");
          } else {
            // console.log('Microdata',element.innerText);
            return element.innerText;
          }
        });
      }
    },
    {
      //DublinCore
      //http://dublincore.org/documents/usageguide/#html
      selector: '[name="dc.title"], [name="DC.title"], [name="dc.Title"]',
      parser: function(array) {
        // console.log('Dublin',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Google Scholar
      //https://scholar.google.com/intl/en/scholar/inclusion.html#indexing
      selector: '[name="citation_title"], [name="Citation_Title"]',
      parser: function(array) {
        // console.log('Google',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Data attribute
      //Chicago Tribune
      selector: '[data-sc-ti]',
      parser: function(array) {
        // console.log('Data',array.map(element => element.dataset.scTi));
        return array.map(element => element.dataset.scTi);
      }
    },
    {
      //OpenGraph //Facebook //Twitter
      //http://ogp.me/
      selector: '[property="og:title"], [name="fb_title"], [property="twitter:title"]',
      parser: function(array) {
        // console.log('OpenGraph',array,array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Title
      selector: 'title',
      parser: function(array) {
        // console.log('title',array.map(element => element.innerText));
        return array.map(element => element.innerText);
      }
    }
  ];

  let found = [];
  for( var selector of selectors) {
    try {
      found.push(
          ...selector.parser(
            [].slice.call(
              document.querySelectorAll(selector.selector)
            )
          )
        );
    } catch (e) {
      console.log(selector.selector,e);
      return null;
    }
  }
  console.log('structured title:',found,found.filter(element => element)[0]);
  found = found.filter(element => element);
  let final = found instanceof Array && found.length > 0 ? found[0] : '';
  return final;
}

function getPublication() {
  var selectors = [
    {
      //ld+JSON
      //Fox, Bloomberg, Medium, not(Wired)
      selector: '[type="application/ld+json"]',
      parser: function(array){
        return array.filter((element)=>{return JSON.parse(element.innerText).publisher ? true : false;})
        .reduce((result,element)=>{
          let publisher = JSON.parse(element.innerText).publisher;
          if (publisher instanceof Array){
            //Multiple authors @type=person, spread result
            result.push(...publisher.map(org => org.hasOwnProperty('name') ? org.name.toString() : org));
          } else if (publisher.hasOwnProperty('name')) {
            //Single author @type=person
            result.push(publisher.name.toString());
          } else {
            //Invalid author === string
            result.push(publisher);
          }
          // console.log('json',result);
          return result;
        },[]);
      }
    },
    {
      //Microdata
      //https://schema.org/
      selector: '[itemtype="http://schema.org/Periodical"] > [itemprop="name"], [itemtype="http://schema.org/Website"] > [itemprop="name"], [itemprop="isPartOf"] > [itemprop="name"]',
      parser: function(array) {
        return array.map(element => {
          if (element.getAttribute("content")){
            // console.log('Microdata',element.getAttribute("content"));
            return element.getAttribute("content");
          } else {
            // console.log('Microdata',element.innerText);
            return element.innerText;
          }
        });
      }
    },
    {
      //DublinCore
      //http://dublincore.org/documents/usageguide/#html
      selector: '[name="dc.relation.ispartof"], [name="DC.relation.ispartof"], [name="dc.Relation.Ispartof"]',
      parser: function(array) {
        // console.log('Dublin',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Google Scholar
      //https://scholar.google.com/intl/en/scholar/inclusion.html#indexing
      selector: '[name="citation_journal_title"], [name="citation_volume"], [name="citation_date"]',
      parser: function(array) {
        // console.log('Google',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //Data attribute
      //Chicago Tribune
      selector: '[data-sc-nn]',
      parser: function(array) {
        // console.log('Data',array.map(element => element.dataset.scNn));
        return array.map(element => element.dataset.scNn);
      }
    },
    {
      //PRISM
      //https://www.idealliance.org/prism-metadata
      selector: '[name="prism.publicationName"],[name="prism:publicationName"]',
      parser: function(array) {
        // console.log('Prism',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //OpenGraph
      //http://ogp.me/
      selector: '[property="og:site_name"]',
      parser: function(array) {
        // console.log('OpenGraph',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    },
    {
      //DublinCore ALT - Technically not correct. This is the publishing house not the publication.
      //http://dublincore.org/documents/usageguide/#html
      selector: '[name="dc.publisher"], [name="DC.publisher"], [name="dc.Publisher"]',
      parser: function(array) {
        // console.log('Dublin Alt',array.map(element => element.getAttribute("content")));
        return array.map(element => element.getAttribute("content"));
      }
    }
    // ,
    // {
    //   //Wikimedia - This is an abuse of this metadata.
    //   //http://dublincore.org/documents/usageguide/#html
    //   selector: '[type="application/opensearchdescription+xml"]',
    //   parser: function(array) {
    //     return array.map(element => element.getAttribute("title"));
    //   }
    // }
    //,
    // {
    //   //DublinCore ALT - If the creator(author) and publisher are the same, then the publisher will be here.
    //   //http://dublincore.org/documents/usageguide/#html
    //   selector: '[name="dc.creator"], [name="DC.creator"], [name="dc.Creator"]',
    //   parser: function(array) {
    //     return array.map(element => element.getAttribute("content"));
    //   }
    // }
  ];

  let found = [];
  for( var selector of selectors) {
    try {
      found.push(
          ...selector.parser(
            [].slice.call(
              document.querySelectorAll(selector.selector)
            )
          )
        );
    } catch (e) {
      console.log(selector.selector,e);
      return null;
    }
  }
  console.log('structured publication:',found,found.filter(element => element)[0]);
  found = found.filter(element => element);
  let final = found instanceof Array && found.length > 0 ? found[0] : '';
  return final;
}


// Object to hold information about the current page
var author;
var summary;
var tags = '';

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

  return time > 0 ? result : '';
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
  "Title": getTitle(),
  "Url": '',
  "Summary": summary,
  "Author": author,
  "Tags": tags,
  "DatePublished": getDatePublished(),
  "Publication": getPublication()
};

//TODO:
//gather website/publisher/organization name
//gather media type

pageInfo = escapeObject(pageInfo);

function escapeObject(object) {
  for(var element in object) {
    // object[element] = escapeHTML(object[element]);
    object[element] = encodeURIComponent(object[element]);
  }
  return object;
}

function escapeHTML(content) {
  //Use browsers built-in functionality to quickly and safely escape strings.
  var div = document.createElementNS('http://www.w3.org/199/xhtml', 'div');
  div.appendChild(document.createTextNode(content));
  return div.innerHTML;
}

console.log('page info: ', pageInfo);

chrome.extension.connect().postMessage(pageInfo);
})();
