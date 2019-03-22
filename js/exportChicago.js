// https://www.chicagomanualofstyle.org
// https://www.lib.sfu.ca/help/cite-write/citation-style-guides/chicago/websites

exportChicago = function (app) {

    var rows = app.rows,
        escapeRowData = app.escapeRowData,
        splitAuthor = app.splitAuthor,
        firstLast = app.firstLast,
        lastFirst = app.lastFirst,
        quote = app.quote,
        emphasize = app.emphasize,
        formatDate = app.formatDate,
        formatURL = app.formatURL,
        sortAlpha = app.sortAlpha,
        notCitable = app.notCitable;

    //item.type, item.title, item.author, item.date, item.datepublished, item.url
    function citeWebsite(type, title, author, dateAccessed, datePublished, url, publication) {
        //Check that we have the minimum number of attributes for a web citation.
        //Publisher/Site/Organization name should go after the formatted title.
        if (url && dateAccessed && (author || title)) {
            return `${author ? `${formatAuthors(author)} ` : ``}${quote(title)} ${publication ? `${emphasize(publication)}, ` : ``}${datePublished ? `${publication ? `` : `Last modified `}${formatDate(datePublished)}` : `Accessed ${formatDate(dateAccessed)}`}. ${formatURL(url,true)}.`;
        } else {
            throw arguments[0];
            // notCitable.push({type, title, author, dateAccessed, datePublished, url})
            // return '';
        }
    }

    function formatAuthors(authors) {
        //format authors: `last, first, and first last.` sorted by last name. If >10 authors, show 7 followed by `et al.`
        if (!authors) {
            return ``;
        }
        authors = splitAuthor(authors); //turn authors into an array of structured authors.
        authors.sort((a, b) => {
            return b.lastName - a.lastName;
        });

        et_al = authors.length > 10;
        stop = et_al ? 7 : authors.length - 1;

        function otherAuthors(authors) {
            return `${authors.map((author,index) => {
        if(index > 0 && index <= stop) {
          if(index < stop) { //show other authors
            return `, ${firstLast(author)}`;
          } else if(index == stop && !et_al) { //end with last author
            return `, and $ {
                firstLast(author)
            }
            `;
          } else if(index == stop && et_al) {
            return ', et al'; //end with et al
          } else {
            return '';
          }
        } else {
          return `
            `;
        }
      }).join('')}`;
        }

        return `${lastFirst(authors[0])}${authors.length > 1 ? `${otherAuthors(authors)}` : ''}.`;
    }

    function formatCitation(item) {
        switch (item.type) {
            default:
                try {
                    return citeWebsite(item.type, item.title, item.author, item.date, item.datepublished, item.url, item.publication);
                } catch (e) {
                    console.log("Unable to Cite:", item);
                    notCitable.push(item);
                    return "";
                }
        }
    }

    rows = escapeRowData(rows);

    return `<center>Bibliography</center>${rows.map((row) => formatCitation(row)).sort(sortAlpha).map((row) => `<p style="padding-left:.5in; text-indent:-.5in; line-height:1.5">${row}</p>`).join('')}`;
};