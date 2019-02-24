/*jshint esversion: 6 */
// https://www.apastyle.org/
// https://en.wikipedia.org/wiki/Wikipedia:Citing_Wikipedia
// https://columbiacollege-ca.libguides.com/apa/websites

exportAPA = function({rows, escapeRowData, splitAuthor, lastInitial, quote, emphasize, formatDate, splitDate, toMonths, formatURL, sortAlpha, notCitable}) {

  //item.type, item.title, item.author, item.date, item.datepublished, item.url
  function citeWebsite({type, title, author, date: dateAccessed, datepublished: datePublished, url, publication}) {
    //Check that we have the minimum number of attributes for a web citation.
    //Publisher/Site/Organization name should go after the formatted title.
    //Either `<em>Title</em>` or `"Title." <em>Publication</em>`
    if(url && dateAccessed && (author || title)) {
      return `${author ? `${formatAuthors(author)}` : `${emphasize(title)}.`} (${ datePublished ? `${formatDateAPA(datePublished)}` : `n.d.`}).${author ? ` ${emphasize(title)}.` : ``}${url ? ` Retrieved ${dateAccessed ? `${formatDate(dateAccessed)}, ` : ``}from ${formatURL(url,true)}` : ``}`;
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
    authors.sort((a,b)=>{return b.lastName - a.lastName;});

    et_al = authors.length > 10;
    stop = et_al ? 9 : authors.length - 1;

    function otherAuthors(authors) {
      return `${authors.map((author,index) => {
        if(index > 0 && index <= stop) {
          if(index < stop) { //show other authors
            return `., ${lastInitial(author)}`;
          } else if(index == stop && !et_al) { //end with last author
            return `., & ${lastInitial(author)}`;
          } else if(index == stop && et_al) {
            return '., et al'; //end with et al
          } else {
            return '';
          }
        } else {
          return ``;
        }
      }).join('')}`;
    }

    return `${lastInitial(authors[0])}${authors.length > 1 ? `${otherAuthors(authors)}` : ''}.`;
  }

  function formatDateAPA(date) {
    //format dates: `YYYY, Month DD`
    date = splitDate(date);
    return `${date.year}, ${toMonths(date.month, 'long')}${date.day ? ` ${date.day}` : ``}`;
  }

  function getPublication(url) {
    //BAD Get Publication from URL parts.
    var anchor = new URL('', url);
    return anchor.hostname;
  }

  function formatCitation(item) {
    switch(item.type) {
      default:
      try {
        return citeWebsite(item);
      } catch (e) {
        console.log("Unable to cite:",e);
        notCitable.push(e);
        return "";
      }
    }
  }

  rows = escapeRowData(rows);

  return `<center>References</center>${rows.map((row) => formatCitation(row)).sort(sortAlpha).map((row) => `<p style="padding-left:.5in; text-indent:-.5in; line-height:1.5">${row}</p>`).join('')}`;
};
