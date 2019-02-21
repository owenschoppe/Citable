//HTML5 dragging implementation based on http://www.html5rocks.com/en/tutorials/dnd/basics/
//Optimized to minimize load time and processing time by avoiding jQuery, implementing a function queue for enter events, and optimizing the sort algorithm.
//Created by Owen Schoppe, 2012

//TODO:
//

var dragSrcEl = null;
Element.prototype.hasClassName = function(name) {
  return new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)").test(this.className);
};
Element.prototype.addClassName = function(name) {
  if (!this.hasClassName(name)) {
    this.className = this.className ? [this.className, name].join(' ') : name;
  }
};
Element.prototype.removeClassName = function(name) {
  if (this.hasClassName(name)) {
    var c = this.className;
    this.className = c.replace(new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)", "g"), "");
  }
};

var makeDraggable = function(setTotal) {
  console.log('makeDraggable()');
  console.time('draggable');

  //var id_='columns-almostFinal';
  //var dragHandles_=document.querySelectorAll('#'+id_+' .column');
  var dragHandles = document.querySelectorAll('li.note_wrapper');
  var container = document.querySelector('#container');
  var first = true;
  var placeTimer;
  //console.log('dragHandles: ',dragHandles);
  //var placeholder = $('<' + (/^ul|ol$/i.test(this.tagName) ? 'li' : 'div') + ' class="sortable-placeholder">');
  var placeholder = document.createElement('li');
  placeholder.className = 'placeholder note_wrapper ui-state-default left';
  placeholder.setAttribute('draggable', 'false');

  /*function include(arr,obj) {
        return (arr.indexOf(obj) != -1);
	}*/
  function getDraggableParent(element) {
    //console.log(element, element.draggable);
    while (element.draggable !== true) { // || element.id == 'placeholder'
      //returns a type error when there is no parent element.
      element = element.parentElement;
      if (element.parentElement === null) break;
    }
    return element;
  }

  function handleDragStart(e) {
    console.log('start', e);
    // this / e.target is the source node.
    e.dataTransfer.effectAllowed = 'move';
    //e.dataTransfer.setData('text/html', this.innerHTML);
    var shadow = getDraggableParent(e.target);
    //shadow.childNodes[1].addClassName('moving');
    e.dataTransfer.setDragImage(shadow.childNodes[0], 145, 145); //Sets the drag image to the note element and centers it on the cursor.
    //this.style.opacity = '0.4';
    //this.addClassName('hidden');
    dragSrc = this;
    dragSrcEl = this.cloneNode(true); //try cloning
    //this.className += '  hidden';
    //e.target.addClassName('moving');
    //e.target.parentElement.removeChild(e.target);
    //$(this).hide();
    first = true;
  }

  this.handleDragOver = function(e) {
    //console.log('over',e);
    if (e.preventDefault) {
      e.preventDefault(); //Necessary. Allows us to drop. Also fixes the drop animation.
    }
    //return false;
    //e.dataTransfer.dropEffect='move';

  };
  this.handleDragEnter = function(e) {
    //console.time('dragEnter');
    // this / e.target is the current hover target.
    //console.log("enter: ",e.target.draggable, e);
    //e.preventDefault();
    var target = $(this);

    if (first) {
      var handle = getDraggableParent(e.target);
      if (handle == dragSrc) {
        handle.addClassName('moving');
        //target[$(placeholder).index() < target.index() ? 'after' : 'before'](placeholder);
        handle.parentElement.insertBefore(placeholder, handle);
      }
      first = false;
    }
    //handle.parentElement.insertBefore(placeholder,handle);//.nextSibling

    //console.log(placeTimer);
    if (typeof placeTimer == "number") {
      //console.log('clearTimout placeholder');
      window.clearTimeout(placeTimer);
    }
    placeTimer = window.setTimeout(function() {
      //console.log('setTimeout append placeholder');
      //$(this)[$('.placeholder').index() < $(this).index() ? 'after' : 'before'](placeholder);
      target[$(placeholder).index() < target.index() ? 'after' : 'before'](placeholder);
      //console.timeEnd('dragEnter');
    }, 500);
  };
  this.handleDragLeave = function(e) {
    // this / e.target is previous target element.
    //	console.log('leave',e);
    //var handle = getDraggableParent(e.target);
    //console.log('leaving, ',handle);
    //this.removeClassName('over');
  };

  function handleDrop(e) {
    // this/e.target is current target element.
    console.log('drop', e);
    if (e.stopPropagation) {
      e.stopPropagation(); // Stops some browsers from redirecting.
    }
    // Don't do anything if dropping the same column we're dragging.
    if (dragSrcEl != this) {
      //TODO: This is where the swap takes place. Stop this and instead drop onto a portable target.
      // Set the source column's HTML to the HTML of the column we dropped on.
      //console.log(e.dataTransfer.getData('text/html'));
      //console.log(this.innerHTML);
      //dragSrcEl.innerHTML = this.innerHTML;
      //this.innerHTML = e.dataTransfer.getData('text/html');

      //this.parentElement.replaceChild(dragSrcEl, this); //works but fails if not on placeholder

      //placeholder.parentElement.replaceChild(dragSrcEl, placeholder);
      //initHandle(dragSrcEl);
    }
    return false;
  }

  function handleDragEnd(e) {
    console.log('end', e);
    // this/e.target is the source node.
    [].forEach.call(dragHandles, function(dragHandle) {
      //dragHandle.classList.remove('over');
      dragHandle.removeClassName('over');
      dragHandle.removeClassName('moving');
      //dragHandle.removeClassName('hidden');
    });

    //Handle the drop action here instead of in drop.
    placeholder.parentElement.replaceChild(dragSrcEl, placeholder);
    initHandle(dragSrcEl);

    //placeholder.outerHTML = e.dataTransfer.getData('text/html');
    //initHandle(placeholder);

    this.parentElement.removeChild(this); //Works. Removes the original element which is now hidden.
    sortNotes();
  }

  [].forEach.call(dragHandles, function(dragHandle) {
    initHandle(dragHandle);
  });

  function initHandle(dragHandle) {
    dragHandle.setAttribute('draggable', 'true');
    dragHandle.addEventListener('dragstart', handleDragStart, false);
    dragHandle.addEventListener('dragenter', handleDragEnter, false);
    //dragHandle.addEventListener('dragover', handleDragOver, false);
    //dragHandle.addEventListener('dragleave', handleDragLeave, false);
    dragHandle.addEventListener('dragend', handleDragEnd, false);
    //dragHandle.addEventListener('drop', handleDrop, false);
  }

  container.addEventListener('dragover', handleDragOver, false); //fixes the drop animation
  //placeholder.addEventListener('dragover', handleDragOver, false);
  placeholder.addEventListener('drop', handleDrop, false);
  placeholder.addEventListener('dragleave', handleDragLeave, false);
  //placeholder.addEventListener('dragend', handleDragEnd, false);

  console.timeEnd('draggable');

  ////////////////////////////////////////////////////////////////////////////////
  function sortNotes(event, ui) {
    function onStorage(items){
      console.log('sortNotes()');
      console.time('sortNotes');
      //Remove empty pages.
      $('ul:empty').parent().remove();

      var lists = $('ul');

      //Iterate through every ul and trim to 6 notes.
      var iterations = 0;
      //Move 7th notes to the next page on stop.
      var endNotes = $('ul li:nth-child(7)');
      while (endNotes.length > 0) {
        var note = endNotes.eq(0);
        //console.log(iterations, $('ul li:nth-child(7)').length, note, lists.length, note.parent().index('ul'));
        var nextPageIndex = note.parent().index('ul') + 1;
        if (nextPageIndex == lists.length) {
          //console.log('Add page.');
          var page = document.createElement('div');
          page.id = "page_"+nextPageIndex;
          page.className = 'page ' + items.orientation;
          var content = document.createElement('ul');
          content.id = "content_"+nextPageIndex;
          content.className = "sortable content"; //For jquery UI sortable.
          page.appendChild(content);
          //$(page).appendTo('#output');
          var container = document.getElementById('container');
          container.appendChild(page);
          //lists = $('ul'); //Update lists.
          lists = lists.add(content);
        }
        lists.eq(nextPageIndex).prepend(note);
        //To prevent infinite loops.
        //if(iterations > pages){
        iterations++;
        if (iterations > lists.length) {
          break;
        }
        endNotes = $('ul li:nth-child(7)');
      }//End of while.

    //Iterate through document and add proper spacing.
    /*if(localStorage.orientation == 'landscape'){
    	toggleCSS(0,noteOrderCSS);
    } else{
    	toggleCSS(1,noteOrderCSS);
    }*/

    //Update page total.
    setTotal(lists.length);
    console.timeEnd('sortNotes');
  }
  chrome.storage.local.get(null, onStorage);
  }
};
