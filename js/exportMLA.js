/*jshint esversion: 6 */
// https://style.mla.org/works-cited-a-quick-guide/
// https://columbiacollege-ca.libguides.com/mla/websites
// https://www.mendeley.com/guides/mla-citation-guide
// https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide/mla_formatting_and_style_guide.html

exportMLA = function (app) {

    //{rows, escapeRowData, splitAuthor, firstLast, lastFirst, quote, emphasize, splitDate, toMonths, formatURL, sortAlpha, notCitable}
    var rows = app.rows,
        escapeRowData = app.escapeRowData,
        splitAuthor = app.splitAuthor,
        firstLast = app.firstLast,
        lastFirst = app.lastFirst,
        quote = app.quote,
        emphasize = app.emphasize,
        splitDate = app.splitDate,
        toMonths = app.toMonths,
        formatURL = app.formatURL,
        sortAlpha = app.sortAlpha,
        notCitable = app.notCitable;

    //item.type, item.title, item.author, item.date, item.datepublished, item.url
    function citeWebsite(type, title, author, dateAccessed, datePublished, url, publication) {
        //Check that we have the minimum number of attributes for a web citation.
        //Publisher/Site/Organization name should go after the formatted title.
        //Either `<em>Title</em>` or `"Title." <em>Publication</em>`
        if (url && dateAccessed && (author || title)) {
            return `${author ? `${formatAuthors(author)} ` : ``}${publication ? `${quote(title)} ${emphasize(publication)},` : `${emphasize(title)}.` }${ datePublished ? ` ${formatDateMLA(datePublished)}` : ``}, ${formatURL(url,false)}.${dateAccessed ? ` Accessed ${formatDateMLA(dateAccessed)}.` : ``}`;
        } else {
            throw arguments[0];
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

        et_al = authors.length > 2;
        stop = et_al ? 1 : authors.length - 1;

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

    function formatDateMLA(date) {
        //format dates: `DD Mon. YYYY.`
        date = splitDate(date);
        return `${date.day ? `${date.day} ` : ``}${toMonths(date.month, 'mla')} ${date.year}`;
    }

    function getPublication(url) {
        //BAD Get Publication from URL parts.
        var ref = new URL('', url);
        return ref.hostname;
    }

    function formatCitation(item) {
        switch (item.type) {
            default:
                try {
                    return citeWebsite(item.type, item.title, item.author, item.date, item.datepublished, item.url);
                } catch (e) {
                    console.log("Unable to Cite:", item);
                    notCitable.push(item);
                    return "";
                }
        }
    }

    rows = escapeRowData(rows); //Prevents XSS since we're setting innerHTML...

    return `<center>Works Cited</center>${rows.map((row,i) => formatCitation(row)).sort(sortAlpha).map((row) => `<p style="padding-left:.5in; text-indent:-.5in; line-height:1.5">${row}</p>`).join('')}`;
};