/*jshint esversion: 6 */
//Crashes when the number of records is too large. or for some other reason.
//Crashes if two export windows are open at the same time.
//Crashes occasionally for unknown reasons.
//Crashes if javascript is paused at an interupt and the window is closed. Citable won't open until Chrome is restarted.

//Files persist after they are needed, ideally we remove the file after it is downloaded.

//Simplify the doExport function to handle the row data from Citable and create only web citations, 'misc'.
//For missing functions refer to Bibtex.js
////////////////////////////////////////////////////////////////////////////////
//Listeners
document.addEventListener('DOMContentLoaded', function() {
  app.init();
  document.querySelector('#print-button').addEventListener('click', app.printHandler);
  document.querySelector('#cancel-button').addEventListener('click', app.cancelHandler);
});

var app = (function(app) {

  app.bgPage = '';
  app.rows = [];
  app.citations = '';
  app.notCitable = [];
  app.docName = '';
  app.docKey = '';
  app.extension = {
    format: "chicago", //Default to bibtex for new docs
    get: function() {
      return this.extensions[this.format];
    },
    set: function(format) {
      this.format = format;
      return;
    },
    extensions: {
      apa: '.html',
      chicago: '.html',
      mla: '.html',
      bibtex: '.bib'
    }
  };

  app.init = function() {
    chrome.runtime.getBackgroundPage(function(ref) {
      app.bgPage = ref;
      app.bgPage.toggleAuth(true, function() {
        app.startup();
      });
    });
  };

  app.startup = function() {
    function onStorage(items) {
      var defaultDoc = items.defaultDoc;
      app.extension.set(items.exportFormat || app.extension.format); //Update default format
      if (defaultDoc != undefined) {
        try {
          app.docKey = parseURLParams(document.URL).key[0];
          app.docName = parseURLParams(document.URL).title[0];
          app.initSelect();
        } catch (e) {
          console.log('URL params not found.');
          app.docKey = defaultDoc.id;
          app.docName = defaultDoc.title;
        }
        var printexport = new printExportClass(app.bgPage, app.docKey);
        // console.log('localStorage["defaultDoc"] ', app.docName, app.docKey);
        printexport.gdocs.exportDocument(null, (data) => {
          app.rows = data;
          app.makeFile();
        }); //In printexport.js
        app.showInstructions();
      } else {
        //There is no default document set.
        //This page was loaded from the app icon and not from a document.
        // console.log('Get doc from menu');
      }
    }
    chrome.storage.local.get(null, onStorage);
  };

  app.printHandler = function(e) {
    chrome.storage.local.get('exportFormat', function(response) {
      // console.log("chrome.storage.local.get('exportFormat')", response);
      _gaq.push(['_trackEvent', 'Button', 'Download ' + app.extension.get()]);
      app.saveFile();
    });
    return false;
  };

  app.cancelHandler = function(e) {
    _gaq.push(['_trackEvent', 'Button', 'Cancel Export']);
    window.close();
    return false;
  };

  app.saveFile = function() {
    var blob = new Blob([app.citations.toString()]);
    saveAs(blob, app.docName + app.extension.get()); //Uses FileSave.js
    //Is FileSave.js a future compatible option?
  };

  app.initSelect = function() {
    var select = document.getElementById('format');

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area == 'local' && changes.exportFormat) {
        app.extension.set(changes.exportFormat.newValue);
        select.value = changes.exportFormat.newValue; //If multiple export pages are in use.
        // console.log(changes.exportFormat.newValue);
        app.makeFile();
        app.showInstructions();
      }
    }); //If the user changes the select, rerender.

    changeSelection = function(e) {
      chrome.storage.local.set({
        'exportFormat': e.target.value
      }, function(response) {});
    };

    select.value = app.extension.format; //Init format select menu.
    select.addEventListener('change', changeSelection);
  };

  /////////////////////////////////////////////////////////////////////////////////////////////
  app.makeFile = function() {
    Util.hideMsg();
    app.notCitable = [];

    switch (app.extension.format) {
      case 'apa':
        app.citations = exportAPA(app);
        break;
      case 'chicago':
        app.citations = exportChicago(app);
        break;
      case 'mla':
        app.citations = exportMLA(app);
        break;
      default:
        app.citations = exportBibtex(app);
    }

    document.querySelector('#loading').classList.add('hidden'); //Hide the loading gif.

    document.title = 'Citable - ' + app.docName;

    var total = "<span class='Droid regular'>Document: </span><span class='Droid bold'>" + app.docName + "</span>";
    document.getElementById('total').innerHTML = total;

    var output = document.getElementById('output');
    output.innerHTML = ''; //Clear prior data

    var content = document.createElement('div');
    content.id = "content";
    content.className = "export";

    var file = document.createElement('div');
    file.id = "export";
    if (app.extension.format == 'bibtex') {
      file.innerText = app.citations;
    } else {
      file.innerHTML = app.citations;
    }

    var notCitable = document.createElement('div');
    notCitable.innerHTML = app.formatNotCitable(app.notCitable);

    var title = document.createElement('div');
    title.className = 'font-medium bold m-bottom--small';
    title.innerText = app.docName + app.extension.get();

    content.appendChild(title);
    content.appendChild(file);
    content.appendChild(notCitable);
    output.appendChild(content);
  };

  app.showInstructions = function() {
    var instructions;
    switch (app.extension.format) {
      case 'apa':
        instructions = `<p>Citations use <a href="https://www.apastyle.org/" rel="noreferrer" target="_blank">APA</a> 6th Edition format.</p>
        <p>Be sure to check the formatting and completeness of citations.</p>
        <p>Use your text editor to double space citations and indent subseqent lines, after the first line of each citation, by .5 inches.</p>`;
        break;
      case 'chicago':
        instructions = `<p>Citations use <a href="https://www.chicagomanualofstyle.org/" rel="noreferrer" target="_blank">Chicago Manual of Style</a> 17th Edition format.</p>
        <p>Be sure to check the formatting and completeness of citations.</p>
        <p>Use your text editor to double space citations and indent subseqent lines, after the first line of each citation, by .5 inches. Add one blank space between citations.</p>`;
        break;
      case 'mla':
        instructions = `<p>Citations use <a href="https://www.mla.org/MLA-Style" rel="noreferrer" target="_blank">MLA</a> 8th Edition format.</p>
        <p>Be sure to check the formatting and completeness of citations.</p>
        <p>Use your text editor to double space citations and indent subseqent lines, after the first line of each citation, by .5 inches.</p>`;
        break;
      default:
        instructions = `<p>Citations are exported in BibTeX format.</p>
        <p>Import into <a href="https://www.zotero.org/" rel="noreferrer" target="_blank">Zotero</a> or your favorite citation managment app to generate a bibliography.</p>`;
    }
    document.getElementById('instructions').innerHTML = instructions;
  };

  app.formatNotCitable = function(notCitable) {
    function format(fields) {
      // var fields = row; //We only pass one argument
      var value = [];
      for (var key in fields) {
        value.push(`<div>${key}: ${fields[key]}</div>`);
      }
      return value.join('');
    }

    if (notCitable.length > 0) {
      Util.displayMsg('Incomplete Citations <a class="inverse" href="#incomplete">View<a>');
      return `<h3 id="incomplete" class="font-medium bold m-bottom--small">Insufficient Information to Cite</h3>${notCitable.map((row)=>`<p>${format(row)}</p>`).join('')}`;
    } else {
      return '';
    }
  };

  return app;

})(app || {});

var app = (function(app) {
  ///////////////////////
  // Utility Functions //
  ///////////////////////
  app.escapeRowData = function(array) {
    array = array.map((row) => {
      var obj = {}; //Because each row is an instance of a Gdoc.row we have to copy the row to a new object.
      for (var key in row) {
        obj[key] = Util.escapeHTML(row[key]);
      }
      return obj;
    });
    return array;
  };

  app.lastFirst = function(author) {
    return `${author.lastName}${author.firstName ? `, ${author.firstName}` : ``}`; //For one word names, skip the first name.
  };

  app.lastInitial = function(author) {
    return `${author.lastName}${author.firstName ? `, ${author.firstName.split('')[0]}` : ``}`; //For one word names, skip the first name.
  };

  app.firstLast = function(author) {
    return (`${author.firstName} ${author.lastName}`).trim();
  };

  app.formatDate = function(date) {
    //format dates: `Month DD, YYYY.`
    date = app.splitDate(date);
    return `${app.toMonths(date.month, 'long')} ${date.day ? `${date.day}, ` : ``}${date.year}`;
  };

  app.quote = function(string) {
    return string ? `"${string}."` : ``;
  };

  app.emphasize = function(string) {
    return string ? `<em>${string}</em>` : ``;
  };

  app.formatURL = function(url, protocol) {
    var urlString;
    try {
      var ref = new URL('', url);
      urlString = `${protocol ? `${ref.protocol}` : ``}${ref.hostname}${ref.pathname}`;
    } catch (e) {
      console.log("Unable for format URL.", e);
      urlString = url.toString();
    }
    return url ? `${urlString}` : '';
  };

  app.sortAlpha = function(a, b) {
    first = a.split(' ')[0]
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`"'~()]/g, "") //Punctuation
      .replace(/<(.|\n)*?>/g, "") //HTML tags
      .trim();

    second = b.split(' ')[0]
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`"'~()]/g, "")
      .replace(/<(.|\n)*?>/g, "")
      .trim();

    if (first < second) {
      return -1;
    }
    if (first > second) {
      return 1;
    }
    return 0;
  };

  app.toMonths = function(index, format) {
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
  };

  app.splitDate = function(dateString) {
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
  };

  app.splitAuthor = function(authorString) {
    //item{ creators[ creator{ firstName, lastName, creatorType } ] }

    //Strange things happen if the authorString contains html
    //Unescape any html since the escaped version contains semicolons
    var el = document.createElement('div');
    el.innerHTML = authorString;
    authorString = el.innerText;

    if (app.hasHTML(authorString)) {
      return [{
        lastName: Util.escapeHTML(authorString),
        firstName: '',
        creatorType: 'author'
      }];
    }

    splitAnd = function(authors) {
      var author = [];
      for (var k in authors) {
        var parts = authors[k].split("and");
        for (var j in parts) {
          author.push(parts[j].trim());
        }
      }
      return author;
    };

    splitComma = function(authors) {
      var author = [];
      for (var k in authors) {
        var parts = authors[k].split(",");
        for (var j in parts) {
          author.push(parts[j].trim());
        }
      }
      return author;
    };

    getAuthors = function(authors) {
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
          for (var key in creator) {
            creator[key] = Util.escapeHTML(creator[key]); //Escape the name parts.
          }
          creators.push(creator);
          //console.log(creators);
        }
      }
      return creators;
    };

    //Proceed as normal
    var authors = authorString.split(";");
    authors = splitAnd(authors);
    return getAuthors(authors);
  };

  app.hasHTML = function(string) {
    return string !== Util.escapeHTML(string);
  };

  return app;
})(app || {});
