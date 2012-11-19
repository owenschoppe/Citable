//Listeners
document.addEventListener('DOMContentLoaded', function () {
  
  document.querySelector('#typed').addEventListener('change', fontHandler);
  
  document.querySelector('#hand').addEventListener('change', fontHandler);
  
  document.querySelector('#landscape').addEventListener('change', orientHandler);
  
  document.querySelector('#portrait').addEventListener('change', orientHandler);
  
  document.querySelector('#print-button').addEventListener('click', printHandler);
  
  document.querySelector('#cancel-button').addEventListener('click', cancelHandler);
  
  document.querySelector('#template-button').addEventListener('click', templateHandler);
	
	document.querySelector('#summary1').addEventListener('change', onChangeHandler);
	
	document.querySelector('#title1').addEventListener('change', onChangeHandler);
	
	document.querySelector('#author1').addEventListener('change', onChangeHandler);
	
	document.querySelector('#url1').addEventListener('change', onChangeHandler);
	
	document.querySelector('#tags2').addEventListener('change', onChangeHandler);

});

function fontHandler(e) {
	changeFont(this.form,this.value);
}

function orientHandler(e) {
	changeOrient(this.form,this.value);
}

function printHandler(e) {
	printDocumentPage();
	return false;
}

function cancelHandler(e) {
	window.close();
	return false;
}

function templateHandler(e) {
	openTemplate();
	return false;
}

function onChangeHandler(e){
	changeElement(this.form,this.value);
}
/////////////////////////////////////////////////////////////////////////////////////

	  //Global variables.
	  var pages = 0;
	  var notesPerPage = 6;
	  var sumBool = true;
	  var titleBool = true;
	  var authorBool = true;
	  var urlBool = true;
	  var tagsBool = true;
	  var bgPage = chrome.extension.getBackgroundPage();
	  
      var rows = bgPage.row;
      console.log(rows);
      
//Renders the notes.
renderNotes = function(callback){
		var output = document.getElementById('output');
		output.className = "offset";
		
	  var initPage = function(){
		console.log("new page");
		pages++;
		//var page = document.createElement('div');
		//var content = document.createElement('ul');
		page.id = "page";
		page.className = 'page '+localStorage.orientation;
		content.id = "content";
		content.className = "sortable"; //For jquery UI sortable.
	  }
	  
	  var appendPage = function(){
	  	console.log("append page");
        	
		/*var clear = document.createElement('div');
		clear.id = "clear";
		content.appendChild(clear);*/
		
		page.appendChild(content);
		output.appendChild(page);
	  }

      for (var i = 0, row; row = rows[i]; i++) {
        var div = document.createElement('li');
        var note = document.createElement('div');
        var form = document.createElement('div');
        var shadow = document.createElement('div');
		
		form.id = "form";
		form.setAttribute('data-index',i);
		div.className = "note_wrapper ui-state-default";
		note.id = "note";
        
        if(sumBool) {
			var Summary = document.createElement('div');
			Summary.innerText = row['summary'];
			//Summary.id = "summary";
			Summary.className = "regular summary "+localStorage.font;
			Summary.rows = "12";
			Summary.readOnly = true;
			form.appendChild(Summary);
        }
        
        if(titleBool) {
			var Title = document.createElement('div');
			Title.innerText = row['title'];
			//Title.id = "title";
			Title.className = "bold title "+localStorage.font;
			//Title.contentEditable = "true";
			Title.readOnly = true;
			form.appendChild(Title);
        }
        
        if(authorBool) {
			var Author = document.createElement('div');
			Author.innerText = row['author'];
			//Author.id = "author";
			Author.className = "italic author fullWidth "+localStorage.font;
			Author.readOnly = true;
			form.appendChild(Author);
        }
        
        if(urlBool) {
			var URL = document.createElement('div');
			URL.innerText = row['url'];
			//URL.id = "url";
			URL.className = "italic url fullWidth "+localStorage.font;
			URL.readOnly = true;
			form.appendChild(URL);
        }
        
        if(tagsBool) {
			var Tags = document.createElement('div');
			Tags.innerText = row['tags'];
			//Tags.id = "tags";
			Tags.className = "bold tags "+localStorage.font;
			Tags.readOnly = true;
			form.appendChild(Tags);
        }
        note.appendChild(form);
		div.appendChild(note);
		
		shadow.id = "shadow";
        div.appendChild(shadow);
        
        console.log('i:', i);
        if(i%notesPerPage == 0){
        	var page = document.createElement('div');
			var content = document.createElement('ul');
        	initPage();
		}
        
        content.appendChild(div);
        
        if(((i+1)%notesPerPage == 0) || i == rows.length-1){
        	appendPage();        	
        }
        
      }
      //Adds a blank page at the end. //Blank pages are deleted.
      /*var page = document.createElement('div');
	  var content = document.createElement('ul');
      initPage();
      appendPage();*/
      //Loads the right number in to the controlbar.
      setTotal();
      //Initialized the note placement class based on a stored value in background.html.
      toggleCSS(localStorage.orientation=='portrait'? 1 : 0 );
      
      if(callback){callback();}
      
      
}
	
	//Sets the helper text in the control bar to display the total number of pages.
	setTotal = function(num){
		if(num){ pages = num; }
		console.log('Set total: ', pages);
        var total = "<span class='Droid regular'>Total: </span><span class='Myriad bold'>"+pages+" sheets of stickies</span>";
        document.getElementById('total').innerHTML = total;
    }
      
      // Persistent click handler for changing the title of a document.
		$('[contenteditable="true"]').live('blur', function(index) {
		  var index = $(this).parent().attr('data-index');
		  // Only make the XHR if the user chose a new title.
		  //if ($(this).text() != bgPage.docs[index].title) {
		  var row = rows[index];
		  if ($(this).text() != rows[index]['title']) {
		  	console.log('old title: ',rows[index]['title'],' new title: ',$(this).text(),' original title: ',bgPage.row[index].title);
			//bgPage.row[index].title = $(this).text(); //ok
			
//******create a new function to update the spreadsheet contents based on the changes*********
			//gdocs.updateDoc(bgPage.docs[index]);
		  }
		});
	
	//Prints this page. Doesn't work if it is clicked too often in a period of time. Use Command+P instead.
	function printDocumentPage(callback) 
	{
			console.log('open print dialog');
			window.print();
			console.log('done printing');
			//chrome.tabs.create({ 'url' : 'print.html'});
			if(callback){callback();}
	}
	
	//Opens a new tab that prints a template.
	function openTemplate()
	{
		if(localStorage.orientation == 'portrait') { 
			console.log('Open portrait template, ', localStorage.orientation);
			chrome.tabs.create({ 'url' : 'template-portrait.html'});
		} else {
			console.log('Open landscape template, ', localStorage.orientation);
			chrome.tabs.create({ 'url' : 'template-landscape.html'});
		}
	}
	
	//Changes which font is used.
	changeFont = function(formName, elementName){
		console.log('changeFont ', elementName);
		//Caches the font value;
		localStorage.font = elementName;
		
		if(elementName == 'Droid'){
			console.log('toggle to Droid');
			$('.summary').toggleClass('handwritten Droid');
			$('.title').toggleClass('handwritten Droid');
			$('.author').toggleClass('handwritten Droid');
			$('.url').toggleClass('handwritten Droid');
			$('.tags').toggleClass('handwritten Droid');
			$('.fontIcon').toggleClass('handwritten Droid');
		} else {
			console.log('toggle to handwritten');
			$('.summary').toggleClass('Droid handwritten');
			$('.title').toggleClass('Droid handwritten');
			$('.author').toggleClass('Droid handwritten');
			$('.url').toggleClass('Droid handwritten');
			$('.tags').toggleClass('Droid handwritten');
			$('.fontIcon').toggleClass('Droid handwritten');
		}
		return;
	}
	
	//Changes the orientation of the page.
	changeOrient = function(aForm, aValue){
		console.log('changeOrient ',aValue);
		//Saves the orientation setting in localStorage.
		localStorage.orientation = aValue;

		if(aValue == 'portrait'){
			console.log('toggle to portrait');
			$('.page').toggleClass('landscape portrait');
			$('.landscapeIcon').hide();
			$('.portraitIcon').show();
			toggleCSS(1);
		} else {
			console.log('toggle to landscape');
			$('.page').toggleClass('portrait landscape');
			$('.landscapeIcon').show();
			$('.portraitIcon').hide();
			toggleCSS(0);
		}
		
	}
	
	//Generic function that intializes the form to match the previous settings stored in localStorage.
	initRadio = function(value, key, formName, elementName, callback){
		console.log('initRadio', value);
		if(value){
			if(value == key){
				console.log('Default');
				document.forms[formName].elements[elementName][0].checked = true;
				if(callback){callback(0);}
			} else {
				console.log('Not Default');
				document.forms[formName].elements[elementName][1].checked = true;
				if(callback){callback(1);}
			}
		} else {
			console.log('Initialize');
			document.forms[formName].elements[elementName][0].checked = true;
			if(callback){callback(0);}
		}
	}

	//Toggles on and off the landscape and portrait CSS sheets to set the page orientation when printing.
	var toggleCSS = function(dir, callback) {
		console.log('toggleCSS ', dir);
		//Removes the note placement classes in preparation for changing them.
		$('.note_wrapper').removeClass("left middle right");
		switch(dir){
			case 0: //landscape
				localStorage.orientation = 'landscape'
				//Toggles which @Page css sheet is used.
				document.styleSheets[0].disabled = false;
				document.styleSheets[1].disabled = true;
				//Toggles the visibility of the helper icons in the control bar.
				$('.landscapeIcon').show();
				$('.portraitIcon').hide();
				//Changes the classes of the notes for display purposes.
				$('.note_wrapper').addClass( function(index){
					return index%3==0 ? "left" : (index%3==1 ? "middle" : "right");
				});
				break;
			case 1: //portrait
				localStorage.orientation = 'portrait';
				//Toggles which @Page css sheet is used.
				document.styleSheets[1].disabled = false;
				document.styleSheets[0].disabled = true;
				//Toggles the visibility of the helper icons in the control bar.
				$('.landscapeIcon').hide();
				$('.portraitIcon').show();
				//Changes the classes of the notes for display purposes.
				$('.note_wrapper').addClass( function(index){ 
					return index%2==0 ? "left" : "right"; 
				});
				break;
		}
		if(callback){callback()};
	}
	
	//Changes the font used in the helper icon in the control bar.
	var setFontIcon = function(dir){
		if(dir == 0){ localStorage.font = 'Droid'; } else { localStorage.font = 'handwritten'; }
		$('.fontIcon').addClass(localStorage.font);
	}
	
		
	//Adjusts which elements are visible and saves the value in localStorage.
	changeElement = function(formName, elementName) {
		localStorage[elementName] = Boolean(document.getElementById(elementName).checked);
		var classElement = String('.'+elementName.replace('1',''));
		//console.log(classElement,elementName);
		$(classElement).toggle(localStorage[elementName]=='true' ? true : false);	
		//console.log('changeElement ', formName, elementName, localStorage[elementName]=='true', localStorage[elementName]);
		if(classElement == '.url'){ $('.author').toggleClass(function(){return 'fullWidth'},(localStorage[elementName]=='true'?false:true)); };//Toggle width 100%
		if(classElement == '.author'){ $('.url').toggleClass(function(){return 'fullWidth'},(localStorage[elementName]=='true'?false:true)); };
	}
	
	//Initialize checkbox controls.
	initCheck = function(formName, elementName) {
		console.log('initCheck', elementName, localStorage[elementName]);
		if(localStorage[elementName]){
			if(localStorage[elementName] == 'true'){
				$('#'+elementName).prop("checked", true);
			} else {
				$('#'+elementName).prop("checked", false);
			}
		} else {
			console.log('No value ', localStorage[elementName]);
			localStorage[elementName] = Boolean(true);
			$('#'+elementName).prop("checked", true);
		}
		changeElement(formName, elementName);
	}
	
	//Inital function fired on page load.
	window.onload = function(){
		//Initialized the layout CSS for the radio controls.
		initRadio(localStorage.orientation, 'landscape', 'orientation', 'pages', toggleCSS); //value, key, formName, elementName, callback
		initRadio(localStorage.font, 'Droid', 'fonts', 'font', setFontIcon);
		renderNotes(makeSortable);
		
		//Initialize the checkbox controls and layout.
		var element = ['summary1', 'title1', 'author1', 'url1', 'tags1'];
		for(var i=0; i<element.length; i++){
			initCheck('elements', element[i]);
		}
		console.log(localStorage);
		
		
	}
	
	$(window).scroll( function(){
			$('#indicator').css('top', function(){
				//current position/total height*window height=percentage of window height.
				var relHeight = Math.ceil( $(window).scrollTop()/$(document).height()*($(window).height()-0) ); 
				//console.log(relHeight,$(window).scrollTop(),$(document).height(),$(window).height());
				return 	relHeight;
			});
			//console.log( 'scroll ',$(window).scrollTop() );
			var pages = $('.page');
			var currentPage = {
				page:0,
				percent:0
			};
			for( var i=0; i<pages.length; i++){
				//console.log(i);
				percent = percentScrolledIntoView(pages[i]);
				if(percent > currentPage.percent){
					currentPage.page = i+1;
					currentPage.percent = percent;
				}
			}
			//console.log(currentPage.page,currentPage.percent);
			$('#pageNum').empty().append(currentPage.page);
		});
		
function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
	console.log((elemBottom <= docViewBottom) , (elemTop >= docViewTop));
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function percentScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemHeight = $(elem).height();
    var elemBottom = elemTop + elemHeight;

    var percent = ( ( ((elemBottom <= docViewBottom)?elemBottom:docViewBottom)-((elemTop >= docViewTop)?elemTop:docViewTop) )/elemHeight );
    //console.log(percent,'%');
    return percent;
}
	
	//Sortable items using jquery UI.
makeSortable = function(){
	$(function() {
		console.log('Make sortable');
		$( "ul.sortable" ).sortable({
			delay: 300,
			connectWith: "ul",
			cursor: "pointer",
			handle: "#note",
			tolerance: 'pointer',
			stop: arrangeNotes,
			dropOnEmpty: true,
			scroll: true,
			scrollSensitivity: 70,
			scrollSpeed: 70
			
		});
/**/
		$( "div.Droid" ).disableSelection();
		$( "div.handwritten" ).disableSelection();
	});
}

arrangeNotes = function(event, ui){
	console.log('arrangeNotes');
	//Remove empty pages.
	$('ul:empty').parent().remove();
	
	var lists = $('ul');
	
//Iterate through every ul and trim to 6 notes.
	var iterations = 0;
	//Move 7th notes to the next page on stop.
	while($('ul li:nth-child(7)').length  > 0){
		iterations++;
		var note = $('ul li:nth-child(7)').eq(0);
		console.log(iterations, $('ul li:nth-child(7)').length, note, lists.length, note.parent().index('ul'));
		if(note.parent().index('ul')+1 == lists.length){
			//Add page.
			console.log('Add page.');
			var page = document.createElement('div');
			var content = document.createElement('ul');
			pages++;
			page.id = "page";
			page.className = 'page '+localStorage.orientation;
			content.id = "content";
			content.className = "sortable"; //For jquery UI sortable.

			page.appendChild(content);
			$(page).appendTo('#output');
			$('ul.sortable').sortable({ 
				delay: 300,
				connectWith: "ul",
				cursor: "pointer",
				handle: "#note",
				tolerance: 'pointer',
				stop: arrangeNotes,
				dropOnEmpty: true,
				scroll: true,
				scrollSensitivity: 70,
				scrollSpeed: 70
			});
			lists = $('ul'); //Update lists.
		}
		$('ul').eq(note.parent().index('ul')+1).prepend(note);
				
		//To prevent infinite loops.
		if(iterations > pages){
			break;
		}
	} //End of while.
	
	//Iterate through document and add proper spacing.
	if(localStorage.orientation == 'landscape'){
		toggleCSS(0);
	} else{
		toggleCSS(1);
	}
	//Update page total.
	setTotal(lists.length);
}