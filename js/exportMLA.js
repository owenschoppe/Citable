/*jshint esversion: 6 */
// https://columbiacollege-ca.libguides.com/mla/websites
// https://www.mendeley.com/guides/mla-citation-guide
// https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide/mla_formatting_and_style_guide.html
function exportMLA(rows) {

  function citeWebsite(type, title, authors, dateAccessed, datePublished, url, publication) {
    //Check that we have the minimum number of attributes for a web citation.
    //Publisher/Site/Organization name should go after the formatted title.
    //Either `<em>Title</em>` or `"Title." <em>Publication</em>`
    if(url && dateAccessed && (authors || title)) {
      return `<p>${authors ? `${formatAuthors(authors)} ` : ``}${publication ? `${quote(title)} ${emphasize(publication)}` : `${emphasize(title)}` }${ datePublished ? ` ${formatDateMLA(datePublished)}` : ``}, ${formatURL(url,false)}.${dateAccessed ? ` Accessed ${formatDateMLA(dateAccessed)}.` : ``}</p>`;
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

    et_al = authors.length > 2;
    stop = et_al ? 1 : authors.length;

    function otherAuthors(authors) {
      return `${authors.map((author,index) =>
        (index > 0 && index <= stop) ? `${(index == stop - 1 && !et_al) ? `, and ${firstLast(author)}` : ``}${(index == stop && et_al) ? ', et al' : ''}` : ``
      ).join('')}`;
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
    switch(item.type) {
      default:
      return citeWebsite(item.type, item.title, item.author, item.date, item.datepublished, item.url);
    }
  }

  return `${rows.map((row) => `${formatCitation(row)}`).sort(sortAlpha).join('')}`;
}
