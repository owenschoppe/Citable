//Renders the notes. Optimized.
var render = function(rows, callback, passed){

	  var onStorage = function(items){
	  	  console.log('render.onStorage', items);
	  	  var notesPerPage = 6;
	  	  var pages = 0;
	  	  //Build the array from the string stored in the docKey record.
	  	  var valuesArray = items[docKey];
	  	  //var orientation = localStorage.orientation=='portrait'? 1 : 0;
	        var orientation = items.orientation;
	        var m = items.m == 'true'?' m':'';
	        var font = items.font;

	        var container = document.createElement('div');
	        container.id = "container";

	  	  /*var initPage = function(orientation, m){
	              //console.log("new page");
	              pages++;
	              page.id = "page";
	              page.className = 'page '+orientation+' '+m;
	              content.id = "content";
	              content.className = "sortable"; //For jquery UI sortable.
	  	  };

	  	  var appendPage = function(){
	              //console.log("append page");
	              page.appendChild(content);
	              container.appendChild(page);
	  	  };*/

	  	  /*var arrangeClass = function(orientation, index){
	  		  switch(orientation){
	  			  case 0:
	  				  return index%3===0 ? "left" : (index%3==1 ? "middle" : "right");
	  				  //break;
	  			  case 1:
	  				  return index%3===0 ? "left" : (index%3==1 ? "middle" : "right");
	  				  //break;
	  		  }
	  	  };*/
	  	  var s = valuesArray[0];
	  	  var t = valuesArray[1];
	  	  var a = valuesArray[2];
	  	  var u = valuesArray[3];
	  	  var g = valuesArray[4];

	  	  var sj = (s=='none')?'hidden':"";
	  	  var tj = (t=='none')?'hidden':"";
	  	  var aj = (a=='none')?'hidden':"";
	  	  var uj = (u=='none')?'hidden':"";
	  	  var gj = (g=='none')?'hidden':"";

	  	  var aw = (u=='none')?'fullWidth':'';
	  	  var uw = (a=='none')?'fullWidth':'';

	  	  var index = 0;

	        for (var i = 0, r; r = rows[i]; i++) {
	          var div = document.createElement('li');
	          var note = document.createElement('div');
	          var form = document.createElement('div');
	          var shadow = document.createElement('div');

	  		form.id = "form";
	  		form.setAttribute('data-index',i);
	  		div.className = "note_wrapper ui-state-default left";//+arrangeClass(orientation, index);
	  		//div.setAttribute('draggable',true); //done later in draggable.js
	  		note.id = "note";

	  		var Summary = document.createElement('div');
	  		Summary.innerText = (s!='none')? r[s] : "";
	  		Summary.className = "regular summary "+font+" "+i+" "+sj;
	  		Summary.rows = "12"; //sets field size.
	  		Summary.readOnly = true;
	  		form.appendChild(Summary);

	  		var Title = document.createElement('div');
	  		Title.innerText = (t!='none')? r[t] : "";
	  		Title.className = "bold title "+font+" "+i+" "+tj;
	  		Title.readOnly = true;
	  		form.appendChild(Title);

	  		var Author = document.createElement('div');
	  		Author.innerText = (a!='none')? r[a] : "";
	  		Author.className = "italic author "+font+" "+i+" "+aj+" "+aw;
	  		Author.readOnly = true;
	  		form.appendChild(Author);

	  		var URL = document.createElement('div');
	  		URL.innerText = (u!='none')? r[u] : "";
	  		URL.className = "italic url "+font+" "+i+" "+uj+" "+uw;
	  		URL.readOnly = true;
	  		form.appendChild(URL);

	  		var Tags = document.createElement('div');
	  		Tags.innerText = (g!='none')? r[g] : "";
	  		Tags.className = "bold tags "+font+" "+i+" "+gj;
	  		Tags.readOnly = true;
	  		form.appendChild(Tags);

	          note.appendChild(form);
	  		div.appendChild(note);

	  		shadow.id = "shadow";
	          div.appendChild(shadow);

	          //console.log('i:', i);
	          if(i%notesPerPage == 0){
	          	var page = document.createElement('div');
	  			var content = document.createElement('ul');
	          	//initPage();
	              pages++;
	          	page.id = "page";
	      		page.className = 'page '+orientation+' '+m;
	      		content.id = "content";
	      		content.className = "sortable"; //For jquery UI sortable.
	  		}

	          content.appendChild(div);
	          index++; //Increment the index for setting the position class left,middle,right.

	          if(((i+1)%notesPerPage == 0) || i == rows.length-1){
	          	//appendPage();
	          	page.appendChild(content);
	              container.appendChild(page);
	              index=0; //Reset the index for setting the position class. Necessary?
	          }

	        }

	        if(callback){callback(container, pages, passed);} //2 sec
	    }
	chrome.storage.local.get(null,onStorage);
}
