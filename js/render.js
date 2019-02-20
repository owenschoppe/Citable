/*jshint esversion: 6 */
//Renders the notes. Optimized.
function render(rows, callback, passed) {

  function onStorage(items) {
    console.log('render.onStorage', items);
    var notesPerPage = 6;
    var pages = 0;
    //Build the array from the string stored in the docKey record.
    var valuesArray = items[docKey];
    //var orientation = localStorage.orientation=='portrait'? 1 : 0;
    var orientation = items.orientation;
    var m = items.m == 'true' ? ' m' : '';
    var font = items.font;

    var container = document.createElement('div');
    container.id = "container";
    container.className = "container";

    var s = valuesArray[0];
    var t = valuesArray[1];
    var a = valuesArray[2];
    var u = valuesArray[3];
    var g = valuesArray[4];

    var sj = (s == 'none') ? 'hidden' : "";
    var tj = (t == 'none') ? 'hidden' : "";
    var aj = (a == 'none') ? 'hidden' : "";
    var uj = (u == 'none') ? 'hidden' : "";
    var gj = (g == 'none') ? 'hidden' : "";

    var aw = (u == 'none') ? 'full' : '';
    var uw = (a == 'none') ? 'full' : '';

    var index = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var div = document.createElement('li');
      var note = document.createElement('div');
      var form = document.createElement('div');
      var shadow = document.createElement('div');

      form.id = "form_"+i;
			form.className = "form";
      form.setAttribute('data-index', i);
      div.className = "note_wrapper shadow ui-state-default move"; //+arrangeClass(orientation, index);
      //div.setAttribute('draggable',true); //done later in draggable.js
      note.id = "note_"+i;
			note.className = "note";

      var Summary = document.createElement('div');
      Summary.innerText = (s != 'none') ? r[s] : "";
      Summary.className = "regular summary " + font + " " + i + " " + sj;
      Summary.rows = "12"; //sets field size.
      Summary.readOnly = true;
      form.appendChild(Summary);

      var Title = document.createElement('div');
      Title.innerText = (t != 'none') ? r[t] : "";
      Title.className = "bold title " + font + " " + i + " " + tj;
      Title.readOnly = true;
      form.appendChild(Title);

      var Author = document.createElement('div');
      Author.innerText = (a != 'none') ? r[a] : "";
      Author.className = "author " + font + " " + i + " " + aj + " " + aw;
      Author.readOnly = true;
      form.appendChild(Author);

      var URL = document.createElement('div');
      URL.innerText = (u != 'none') ? r[u] : "";
      URL.className = "url " + font + " " + i + " " + uj + " " + uw;
      URL.readOnly = true;
      form.appendChild(URL);

      var Tags = document.createElement('div');
      Tags.innerText = (g != 'none') ? r[g] : "";
      Tags.className = "tags " + font + " " + i + " " + gj;
      Tags.readOnly = true;
      form.appendChild(Tags);

      note.appendChild(form);
      div.appendChild(note);

      var page;
      var content;

      if (i % notesPerPage == 0) {
        //initPage();
        page = document.createElement('div');
        content = document.createElement('ul');
        pages++;
        page.id = "page_" + i;
        page.className = 'page ' + orientation + ' ' + m;
        content.id = "content_"+i;
        content.className = "sortable content"; //For jquery UI sortable.
      }

      content.appendChild(div);
      index++; //Increment the index for setting the position class left,middle,right.

      if (((i + 1) % notesPerPage == 0) || i == rows.length - 1) {
        page.appendChild(content);
        container.appendChild(page);
        index = 0; //Reset the index for setting the position class. Necessary?
      }
    }

    if (callback) {
      callback(container, pages, passed);
    } //2 sec
  }
  chrome.storage.local.get(null, onStorage);
}
