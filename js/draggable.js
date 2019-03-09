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
    //Create a temporary clone of the element to use as a drag image.
    dragSrcEl = getDraggableParent(e.target)
    var shadow = dragSrcEl.cloneNode(true);
    shadow.style.cssText = "flex: 0 0 auto; position: absolute; top -300px; left: -300px";
    shadow.id = "temporary_drag_image_element";
    document.body.appendChild(shadow);
    e.dataTransfer.setDragImage(shadow.childNodes[0], 145, 145); //Sets the drag image to the note element and centers it on the cursor.
    // dragSrcEl = this.cloneNode(true); //try cloning
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
    console.log("enter: ",e.target.draggable, e);

    var target = e.target;

      var handle = getDraggableParent(e.target);
      if (handle == dragSrcEl) {
        handle.addClassName('moving');
        handle.parentElement.insertBefore(placeholder, handle);
      } else {
        var siblings = [].slice.call(handle.parentElement.children);
        if (siblings.indexOf(placeholder) < siblings.indexOf(handle)) {
            handle.parentElement.insertBefore(placeholder, handle.nextSibling);
        } else {
            handle.parentElement.insertBefore(placeholder, handle);
        }
      }
      first = false;

  };
  
  this.handleDragLeave = function(e) {

  };

  function handleDrop(e) {
    // this/e.target is current target element.
    console.log('drop', e);
    if (e.stopPropagation) {
      e.stopPropagation(); // Stops some browsers from redirecting.
    }
    return false;
  }

  function handleDragEnd(e) {
    console.log('end', e);
    // this/e.target is the source node.
    //What does this do?
    // [].forEach.call(dragHandles, function(dragHandle) {
    //   dragHandle.removeClassName('over');
    //   dragHandle.removeClassName('moving');
    // });
    //show the src el again
    dragSrcEl.removeClassName('moving');

    //Handle the drop action here instead of in drop.
    placeholder.parentElement.replaceChild(dragSrcEl, placeholder);
    initHandle(dragSrcEl);
    sortNotes();
    //Remove the temporary element we used as the drag image.
    [].slice.call(document.querySelectorAll("#temporary_drag_image_element")).forEach(i => i.remove());
  }

  [].forEach.call(dragHandles, function(dragHandle) {
    initHandle(dragHandle);
  });

  function initHandle(dragHandle) {
    dragHandle.setAttribute('draggable', 'true');
    dragHandle.addEventListener('dragstart', handleDragStart, false);
    dragHandle.addEventListener('dragenter', handleDragEnter, false);
    dragHandle.addEventListener('dragend', handleDragEnd, false);
  }

  container.addEventListener('dragover', handleDragOver, false); //fixes the drop animation
  placeholder.addEventListener('drop', handleDrop, false);
  placeholder.addEventListener('dragleave', handleDragLeave, false);

  console.timeEnd('draggable');

  ////////////////////////////////////////////////////////////////////////////////
  function sortNotes(event, ui) {
    function onStorage(items){
      console.log('sortNotes()');
      console.time('sortNotes');
      //Remove empty pages.
    [].slice.call(document.querySelectorAll('ul:empty')).forEach(p => p.parentElement.remove())

      var lists = [].slice.call(document.getElementById('output').querySelectorAll('ul'));

      //Iterate through every ul and trim to 6 notes.
      var iterations = 0;
      //Move 7th notes to the next page on stop.
      var endNotes = document.querySelectorAll('ul li:nth-child(7)');
      while (endNotes.length > 0) {
        var note = endNotes[0];
        var nextPageIndex = lists.indexOf(note.parentElement) + 1;
        if (nextPageIndex == lists.length) {
          var page = document.createElement('div');
          page.className = 'page ' + items.orientation;
          var content = document.createElement('ul');
          content.className = "sortable content";
          page.appendChild(content);
          var container = document.getElementById('container');
          container.appendChild(page);
          //Update lists.
          lists.push(content);
        }
        lists[nextPageIndex].prepend(note);
        //To prevent infinite loops.
        //if(iterations > pages){
        iterations++;
        if (iterations > lists.length) {
          break;
        }
        endNotes = document.querySelectorAll('ul li:nth-child(7)');
      }//End of while.

        //Update page total.
        setTotal(lists.length);
        console.timeEnd('sortNotes');
    }
  chrome.storage.local.get(null, onStorage);
  }
};
