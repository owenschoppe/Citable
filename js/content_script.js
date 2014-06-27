
console.log('content_script');

var getSelectedText = function(){
  // Function: finds selected text on document d.
  // @return the selected text or null
  function f(d){
    var t;
    //Check for a regular selection.
    if (d.getSelection) t = d.getSelection();
    //Check for a range selection.
    else if(d.selection) t = d.selection.createRange();
    if (t.text != undefined) t = t.text;
    //Check text areas for selection.
    if (!t || t=='') {
      var a = d.getElementsByTagName('textarea');
      for (var i = 0; i < a.length; ++i) {
        if (a[i].selectionStart != undefined && a[i].selectionStart != a[i].selectionEnd) {
          t = a[i].value.substring(a[i].selectionStart, a[i].selectionEnd);
          break;
        }
      }
    }
    return t;
  };
  // Function: finds selected text in document d and frames and subframes of d
  // @return the selected text or null
  function g(d){
    var t;
    try{t = f(d);}catch(e){console.log('ERROR: ',e);};
    if ((!t || t == '') && d){
      var docs = [];
      //Add all frames to the doc list.
      var fs = d.getElementsByTagName('frame');
      for (var i = 0; i < fs.length; ++i){
        docs.push(fs[i]);
      }
      //Add all the iframes to the doc list.
      fs = d.getElementsByTagName('iframe');
      for (var i = 0; i < fs.length; ++i){
        docs.push(fs[i]);
      }
      //Iterate through all the docs looking for selected text.
      for (var i = 0; i < docs.length; ++i){
        t = g(docs[i].contentDocument);
        if(t && t.toString() != '') break;
      }
    }
    return t;
  };
  //Initiate the search using the top document.
  var t= g(document);
  //Return the results.
  if (!t || t == '') return ''; //Nothing found.
  else return t.toString(); //Returns selected text.
}

var getAuthor = function(){
	
	var stringAuthors = function(a){
		//console.log('stringAuthors ',a);
		var authors = '';
		for( var i=0; i<a.length; i++){
			console.log('author',i,': ',a[i]);
			authors += $(a[i]).text();
			authors += (i<(a.length-1)? '; ' : '');
		}
		console.log('authors: ',authors);
		return authors;
	}
	
	var parseAuthor = function(author){
		if(author){
			//console.log(author);
			//Parses out just the author's name. Perhaps including the date of publishing and the authors official title would be good.
			var re6='(?:(?!and)\\b[a-z]+\\s|[0-9])'; // First lower case word that isn't 'and' and is followed by a space or number 
			var p = new RegExp(re6,["g"]);
			var m = p.exec(author);
			
			var re4='(?:\\bBy\\b)'; //Non-case senstitive word 'by'
			var q = new RegExp(re4,["i"]);
			
			var re7='(?:\\s+)';
			var r = new RegExp(re7,["g"]);
			
			//console.log(author.search("\\bBy\\b","i"),(m?author.indexOf(m):author.length),author);
			//console.log(author.search(q),(m?author.indexOf(m):author.length),author);
			var loc = author.search(q) //Location of 'by'.
			//console.log(author,loc,author.indexOf(m));
			if((loc < (m?author.indexOf(m):author.length) && loc!=-1)||(loc == 0)){ console.log('split'); author = author.slice(loc+2); }; //If location of 'by' is the first word or is before the first lowercase word or the end, trim off everything before by.
			//console.log(author,author.indexOf(m));
			//author = author.slice(0,(m?author.indexOf(m):author.length));
			//console.log(author);
			author = (author!='' ? $.trim(author) : '');
			//var r = author.search("\\n");
			//author = author.slice(0,(r!=-1?r:author.length)); //Clear any lines after the first line.
			author = author.replace(r,' ');
			
			return author.toString();
		}			
		return '';
	}
	
	var author = '';
		author = (!author && $('[rel*="author"]') ? stringAuthors($('[rel*="author"]')) : author); //NYT, Huffington, Discover Mag, Wired
		//console.log('[rel*="author"]',author);
		author = (!author && $('.byline') ? stringAuthors($('.byline')) : author); //WSJ, NYT, Tribune, New Yorker
		//console.log('.byline',author);
		author = (!author && $('[class*="author"]') ? stringAuthors($('[class*="author"]')) : author); //SF Chronicle
		//console.log('[class*="author"]',author);
		author = (!author && $('.addmd') ? stringAuthors($('.addmd')) : author); //Google Books
		//console.log('.addmd',author);
		author = (!author && $('meta[name*="author"]') ? $('meta[name*="author"]').attr("content") : author); //Businessweek, ACM
		//console.log('meta[name*="author"]',author);

	return parseAuthor(author); //Buggy but works 80% of the time.
	
	//return author.replace(r,' ').trim();
}

// Object to hold information about the current page
var author;
var summary;

try {
	author = getAuthor();
} catch(e) {
	console.log(e);
}

try {
	summary = getSelectedText();
} catch(e){
	console.log(e);
}
var pageInfo = {
	"title": document.title,
	"url": 'test',
	"summary": summary,
	"authorName": author
};

console.log('page info: ', pageInfo);

chrome.extension.connect().postMessage(pageInfo);
