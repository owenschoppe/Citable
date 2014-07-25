
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
    var t = '';
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

/*var getTime = function(){

		var re1='.*?';	// Non-greedy match on filler
		var re2='\\d';	// Uninteresting: d
		var re3='(\\d)';	// Any Single Digit 1
		var re4='(:)';	// Any Single Character 1
		var re5='(\\d)';	// Any Single Digit 2
		var time = new RegExp(re1+re2+re3+re4+re5,["i"]);

		var re6='(<[^>]+>)';	// Tag 1
		var tag = new RegExp(re1,["i"]);

		//Get all elements that match any of the time elements for all the major video players: Vimeo, YouTube, video.js, jwplayer, mediaelement.js, sublime, 
		var timeEl = document.querySelectorAll(".timecode .box, .ytp-time-current, v.js-current-time-display, .jwelapsed, .mejs-currenttime, .sublimevideo-View.sublimevideo-Label");
		if(timeEl.length) {
			//TODO: loop through all the found elements to find the one with a value.??
			console.log('Vimeo tags',timeEl);
			return timeEl[0].innerHTML; //getAttribute('aria-valuetext')
			//var elText = null;

			//Loop through the found elements searching for a time string.
			for(var el in timeEl){
				var text = el.innerHTML;
				
				var m = time.exec(text);
				if (m != null)
				{
					//If we found a time, then set the text to the time. //Should we bail at this point?
					//elText = text;
					return text;
				} else {
					//If the child has children then add them to the search array.
					if (el.hasChildNodes()) {
						timeEl.push(el.childNodes);
					}
				}
			}
			//return elText;
		} else {
			return null;
		}
	//}

};*/

// Object to hold information about the current page
var author;
var summary;
var tags;

//Works for Vimeo, YouTube, HTML5 video, video.js, mediaelement.js, sublime
videoTime = function(){
	var videos = document.getElementsByTagName('video');
	var time = null;
	//console.log("videos:",videos);
	for(var i=0; i<videos.length; i++){
		//console.log("video:",videos[i],videos[i].currentTime);
		//videos[i].addEventListener("timeupdate",updateTags,false);
		if(videos[i].currentTime > 0){
			time = videos[i].currentTime;
		}
	}
	/*var updateTags = function(e){
		//Since we may have multiple videos calling tags, how do we handle conflicts?
		console.log('current time:',e);
		tags = e.target.currentTime();
	};*/
	var totalSec = Math.round(time);
	var hours = parseInt( totalSec / 3600 ) % 24;
	var minutes = parseInt( totalSec / 60 ) % 60;
	var seconds = totalSec % 60;
	var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
	
	return time>0?result:null;
}

//videoTime();

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

try {
	//tags = getTime();
	tags = videoTime();
} catch(e){
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
