/*jshint esversion: 6 */
function exportChicago(rows) {

  function citeWebsite(type, title, authors, dateAccessed, datePublished, url) {
    //Check that we have the minimum number of attributes for a web citation.
    //Publisher/Site/Organization name should go after the formatted title.
    if(url && dateAccessed && (authors || title)) {
      return `<p>${authors ? `${formatAuthors(authors)} ` : ``}${quote(title)} ${ datePublished ? `Last modified ${formatDate(datePublished)}` : `Accessed ${formatDate(dateAccessed)}`}. ${formatURL(url,true)}</p>`;
    } else {
      console.log('Insufficient information to cite:',type,title,authors,dateAccessed,datePublished,url);
      return '';
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
    stop = et_al ? 7 : authors.length;

    function otherAuthors(authors) {
      return `${authors.map((author,index) =>
        (index > 0 && index <= stop) ? `${(index == stop - 1 && !et_al) ? `, and ${firstLast(author)}` : ``}${(index == stop && et_al) ? ', et al' : ''}` : ``
      ).join('')}`;
    }

    return `${lastFirst(authors[0])}${authors.length > 1 ? `${otherAuthors(authors)}` : ''}.`;
  }

  function formatCitation(item) {
    switch(item.type) {
      default:
      return citeWebsite(item.type, item.title, item.author, item.date, item.datepublished, item.url);
    }
  }

  return `${rows.map((row) => `${formatCitation(row)}`).sort(sortAlpha).join('')}`;
}
