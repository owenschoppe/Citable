/*jshint esversion: 6 */
(function() {
  console.log('Content Script');

  /////////////////
  //    Utils    //
  /////////////////
  function dedupe(array) {
    return Array.from(new Set(array));
  }

  function escapeObject(object) {
    for (var element in object) {
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

  /////////////////////////
  //    Selected Text    //
  /////////////////////////
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
        console.log(e);
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
          try {
            t = g(docs[k].contentDocument);
          } catch (e) {
            console.log(e);
          }
          if (t && t.toString() != '') break;
        }
      }
      return t;
    }

    //Initiate the search using the top document.
    var t = '';
    try {
      t = g(document);
    } catch (e) {
      console.log(e);
    }

    //Return the results.
    if (!t || t == '') return ''; //Nothing found.
    else return t.toString().trim(); //Returns selected text.
  };

  //////////////////
  //    Author    //
  //////////////////
  var getAuthor = function() {

    var parseAuthor = function(author) {
      if (author) {
        // console.log('parse', author);
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

        return capitalizeWords(author.toString());
      }
      return '';
    };

    var capitalizeWord = function(string) {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    };

    var capitalizeWords = function(string) {
      return string.split("; ").map(word => isUpperCase(word) && hasPunctuation(word) ? word.split(" ").map(w => capitalizeWord(w)).join(" ") : word).join("; ");
    };

    var isUpperCase = function(string) {
      return string == string.toUpperCase();
    };

    var hasPunctuation = function(string) {
      return string == string.replace(/[.,\/#!$%\^&\*;:{}=\-_`"'~()]/g, "");
    };

    function stringifyElements(elements) {
      var style = "";
      return stringifyAuthors(elements.map(element => {
          initStyle = element.style.textTransform;
          element.style.cssText = "text-transform: initial !important;";
          var text = element.innerText;
          element.style.cssText = `text-transform: ${initStyle}`;
          return text;
        }) //map them to text and only take the text before the return character
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
      var parent = startElement; //should walk up from the selection...instead of the element.
      var relatives = [];
      var siblings = [];

      while (parent != document.body && relatives.length <= 0 && siblings.length <= 1) {
        // console.log('parent:',parent);
        parent = parent.parentNode; //Move up one level.
        relatives = parent.querySelectorAll('h1'); //Is there a related H1?
        siblings = [].slice.call(parent.querySelectorAll(selector))
          .filter(element => {
            return (visibility == (element.getBoundingClientRect().height > 1)) && element.innerText; //Element must be visible and not blank.
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
      array = array.filter((element, i) => {
        var leaf = true;
        for (var j = i + 1; j < array.length; j++) { //Compare with all following elements.
          leaf =
            array[j].compareDocumentPosition(array[i]) & Node.DOCUMENT_POSITION_CONTAINS || array[j] === array[i] ?
            false : leaf; //OR use array[i].contains(array[j])
        }
        return leaf;
      });
      array = array.filter(element => element.innerText.trim().length > 0); //Also remove any empty nodes.
      return array;
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
      '.addmd', //Google Books
      //Discover Mag, Politico, Bangor Daily, NBC, Fox
      '#upload-info #owner-name' //Youtube
    ];

    function findAuthors(selector, selectionElement) {
      var authors = [];
      //if selection elements
      //return getRelatedAuthors(selectionElement,selector) try various

      //else
      //For each found element, turn it into an array of it's visible sibling authors, filter out null arrays, return the first
      try {
        authors.push(
          stringifyElements((() => {
            var array = [].slice.call(document.querySelectorAll(selector));
            array = array.map(element => getRelatedAuthors(element, selector, (element.getBoundingClientRect().height > 1)).siblings);
            array = array.map(array => filterDescendants(array));
            array = array.filter(siblingArray => siblingArray.length > 0); //filter out empty arrays
            return array[0]; //Take the first non-empty array
          })())
        ); //filter out parents from arrays
      } catch (e) {
        authors.push("");
        console.log(e);
      }
      console.log('Get Unstructured', authors);
      return authors[0]; //take first non-empty array of authors
    }

    var structuredSelectors = [{
        //ld+JSON
        //Fox, Bloomberg, Medium, not(Wired)
        selector: '[type="application/ld+json"]',
        parser: function(array) {
          return array.filter((element) => {
              return JSON.parse(element.innerText).author ? true : false;
            })
            .reduce((result, element) => {
              var author = JSON.parse(element.innerText).author;
              if (author instanceof Array) {
                //Multiple authors @type=person, spread result
                result = result.concat(author.map(person => person.hasOwnProperty('name') ? person.name.toString() : person));
              } else if (author.hasOwnProperty('name')) {
                //Single author @type=person
                result.push(author.name.toString());
              } else {
                //Invalid author === string
                result.push(author);
              }
              return result;
            }, []);
        }
      },
      {
        //DublinCore
        //Science, New England Journal of Medicine, Google Scholar
        selector: '[name="dc.creator"], [name="DC.creator"], [name="dc.Creator"], [name="citation_author"]',
        parser: function(array) {
          return array.map(element => element.content);
        }
      },
      {
        //Microdata
        //Politico, NYT, not(Atlantic sometimes, take first and find siblings...)
        selector: '[itemtype*="Article"] [itemprop*="author"] [itemprop*="name"]',
        parser: function(array) {
          return array.map(element => element.content || element.innerText);
        }
      },
      {
        //RDFa
        //Coffeecode
        selector: '[property*="author"] [property*="name"]',
        parser: function(array) {
          return array.map(element => element.innerText);
        }
      },
      {
        //DataProp
        //Washington Post
        selector: '[itemprop*="article"] [data-authorname]',
        parser: function(array) {
          return array.map(element => element.innerText);
        }
      },
      {
        //data-scrim
        //Wall Street Journal
        selector: '[data-scrim]',
        parser: function(array) {
          return array.map((element) => {
            var data = JSON.parse(element.dataset.scrim);
            if (data.type == "author") {
              return data.header;
            } else {
              return null;
            }
          });
        }
      },
      {
        //meta tag
        //Chicago Tribune, Science Mag
        selector: '[name="author"], [name="news_authors"]',
        parser: function(array) {
          return array.map(element => element.content);
        }
      }
    ];

    function getStructuredAuthor(selectors) {
      //TODO: This can be consolidated with the other structured searches, but the other functions need to be rewritten to expect an array of arrays. Everything should use thie array.push instead of concat.
      var authors = [];
      for (var selector of selectors) {
        try {
          //Build an array of arrays.
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
          console.log(selector.selector, e);
        }
      }
      console.log('Get Structured', authors);
      return stringifyAuthors(authors.sort((a, b) => {
        return b.length - a.length;
      })[0]); //Schema.org
    }

    //Get smarter about selecting which one.
    //Filter out empty entries in the array created by joining an empty array.
    var author = '';
    try {
      try {
        author = getStructuredAuthor(structuredSelectors);
      } catch (e) {
        console.log(e);
      }
      if (!author) {
        author = findAuthors(selectors.join());
      }
      author = parseAuthor(author);
    } catch (e) {
      console.log(e);
    }

    return author; //Buggy but works 80% of the time.
  };

  //////////////////////////
  //    Date Published    //
  //////////////////////////
  function getDatePublished() {
    var selectors = [{
        //ld+json
        //https://schema.org/
        selector: '[type="application/ld+json"]',
        parser: function(array) {
          return array.filter((element) => {
              return JSON.parse(element.innerText).datePublished ? true : false;
            })
            .reduce((result, element) => {
              var date = JSON.parse(element.innerText).datePublished;
              if (date instanceof Array) {
                //Multiple dates, just take the first one
                result.push(date[0]);
              } else {
                //Invalid author === string
                result.push(date);
              }
              return result;
            }, []);
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

    var dates = getStructured(selectors);
    var date = new Date(dates[0]).toUTCString(); //Schema.org
    date = [].slice.call(date.split(' ')).filter((e, i, a) => i != a.length - 1 && i != 0).join(' ');
    return date == "Invalid Date" ? "" : date;
  }

  /////////////////////////
  //    Article Title    //
  /////////////////////////
  function getTitle() {
    var selectors = [{
        //ld+JSON
        //https://jsonld.com/article/
        //Fox, Bloomberg, Medium, not(Wired)
        selector: '[type="application/ld+json"]',
        parser: function(array) {
          return array.filter((element) => {
              return JSON.parse(element.innerText).headline ? true : false;
            })
            .reduce((result, element) => {
              var headline = JSON.parse(element.innerText).headline;
              result.push(headline);
              // console.log('json',result);
              return result;
            }, []);
        }
      },
      {
        //Microdata
        //https://schema.org/
        selector: '[itemtype="http://schema.org/Report"] > [itemprop="name"], [itemtype="http://schema.org/ScholarlyArticle"] > [itemprop="name"], [itemtype="http://schema.org/NewsArticle"] > [itemprop="name"], [itemtype="http://schema.org/TechArticle"] > [itemprop="name"]',
        parser: function(array) {
          return array.map(element => {
            if (element.getAttribute("content")) {
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
        selector: 'head title',
        parser: function(array) {
          // console.log('title',array.map(element => element.innerText));
          return array.map(element => element.innerText);
        }
      }
    ];

    var found = getStructured(selectors);
    var final = found instanceof Array && found.length > 0 ? found[0] : '';
    return final;
  }

  ///////////////////////
  //    Publication    //
  ///////////////////////
  function getPublication() {
    var selectors = [{
        //ld+JSON
        //Fox, Bloomberg, Medium, not(Wired)
        selector: '[type="application/ld+json"]',
        parser: function(array) {
          return array.filter((element) => {
              return JSON.parse(element.innerText).publisher ? true : false;
            })
            .reduce((result, element) => {
              var publisher = JSON.parse(element.innerText).publisher;
              if (publisher instanceof Array) {
                //Multiple authors @type=person, spread result
                result = result.concat(publisher.map(org => org.hasOwnProperty('name') ? org.name.toString() : org));
              } else if (publisher.hasOwnProperty('name')) {
                //Single author @type=person
                result.push(publisher.name.toString());
              } else {
                //Invalid author === string
                result.push(publisher);
              }
              // console.log('json',result);
              return result;
            }, []);
        }
      },
      {
        //Microdata
        //https://schema.org/
        selector: '[itemtype="http://schema.org/Periodical"] > [itemprop="name"], [itemtype="http://schema.org/Website"] > [itemprop="name"], [itemprop="isPartOf"] > [itemprop="name"]',
        parser: function(array) {
          return array.map(element => {
            if (element.getAttribute("content")) {
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
    ];

    var found = getStructured(selectors);
    var final = found instanceof Array && found.length > 0 ? found[0] : '';
    return final;
  }

  //////////////////////
  //    Video Time    //
  //////////////////////
  //Works for Vimeo, YouTube, HTML5 video, video.js, mediaelement.js, sublime
  videoTime = function() {
    var videos = document.getElementsByTagName('video');
    var time = 0;
    var result = '';
    var getTime = function(videos) {
      // console.log("videos:", videos);
      for (var i = 0; i < videos.length; i++) {
        if (videos[i].currentTime > 0) {
          return videos[i].currentTime; //Return the first non-zero time.
        }
      }
      return 0;
    };
    try {
      time = getTime(videos);
      // console.log("video time:", time);
      var totalSec = Math.round(time);
      var hours = parseInt(totalSec / 3600) % 24;
      var minutes = parseInt(totalSec / 60) % 60;
      var seconds = totalSec % 60;
      result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
    } catch (e) {
      console.log(e);
    }

    return time > 0 ? result : '';
  };

  /////////////////////
  //    Page Info    //
  /////////////////////
  var getStructured = function(selectors) {
    var found = [];
    for (var selector of selectors) {
      try {
        found = found.concat(
          selector.parser(
            [].slice.call(
              document.querySelectorAll(selector.selector)
            )
          )
        );
      } catch (e) {
        console.log(selector.selector, e);
      }
    }
    found = found.filter(element => element);
    console.log('Get Structured', found);
    return found;
  };

  var pageInfo = {
    "Title": getTitle() || '',
    "Url": '',
    "Summary": getSelectedText() || '',
    "Author": getAuthor() || '',
    "Tags": videoTime() || '',
    "DatePublished": getDatePublished() || '',
    "Publication": getPublication() || ''
  };
  //TODO:
  //gather publisher/organization name
  //gather media type

  pageInfo = escapeObject(pageInfo);
  console.log('Page Info', pageInfo);

  chrome.extension.connect().postMessage(pageInfo);
})();
