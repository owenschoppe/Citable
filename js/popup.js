/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
*/

//Begin closure
(function(){

function onError(e) {
  console.log(e);
}


//Original
var gDriveApp = angular.module('gDriveApp', []);

//Creates a service called gdocs
gDriveApp.factory('gdocs', function() {
  console.log('run GDocs constructor');
  var gdocs = new GDocs();

  return gdocs;
});

gDriveApp.factory('state', function() {
  console.log('run state constructor');
  //var defaultDocument = {};
  success = function(items) {
          //defaultDocument = items;
          // Notify that we saved.
          console.log('Settings retrieved',items);
          state.defaultDoc = items.defaultDoc;
  }
  chrome.storage.sync.get('defaultDoc', success)
  var state = {
            docs:[],
            defaultDoc:0, //If we have a default doc in storage then use that, otherwise use Create New Doc.
            menu:false,
            isLoading:true,
            newDoc:false,
            citation:{
              note:'',
              url:'',
              author:'',
              tags:'',
              title:''
            }
          };
  console.log('state',state);
        return {
            
            getState: function() {
              return state;
            }
        };
    

});


//gDriveApp.service('gdocs', GDocs);
//gDriveApp.controller('DocsController', ['$scope', '$http', DocsController]);

gDriveApp.controller('CitationController', ['$scope', 'state', function($scope, state){
  
  var bgPage = chrome.extension.getBackgroundPage();

  $scope.state = state.getState();
  
  $scope.getPageInfo = function(){
    bgPage.getPageInfo($scope.setCitation);
  }

  $scope.setCitation = function(pageInfo){
    console.log('setCitation',pageInfo);
    state.citation = pageInfo;
    $scope.state.citation = state.citation; //Update $scope.citation
  }

  /*$scope.getCitation = function(){
    console.log('getCitation',state.citation,citation);
    return state.citation;
  }*/

  $scope.getPageInfo();

} ]);

// Main Angular controller for app.
//function DocsController($scope, $http, gdocs) { //Use this if not using closure.
gDriveApp.controller('DocsController', ['$scope', '$http', 'gdocs', 'state', function($scope, $http, gdocs, state){
  $scope.docs = state.docs; //Makes docs available to angular {{}}.
  $scope.cats = [];

  $scope.state = state.getState();
  console.log('state.defaultDoc on DocsController init',state.getState(),$scope.state);

  //this.state = $scope.state;
  //console.log('state',this.state);

  // Response handler that caches file icons in the filesystem API.
  function successCallbackWithFsCaching(resp, status, headers, config) {
    console.log(resp);

    //$scope.docs = [];

    var totalEntries = resp.items.length;

    resp.items.forEach(function(entry, i) {
      var doc = {
        title: entry.title,
        id: entry.id,
        updatedDate: Util.formatDate(entry.modifiedDate),
        updatedDateFull: entry.modifiedDate,
        icon: entry.iconLink,
        alternateLink: entry.alternateLink,
        size: entry.fileSize ? '( ' + entry.fileSize + ' bytes)' : null
      };

      $scope.docs.push(doc);
        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          $scope.docs.sort(Util.sortByDate);
          //state.docs = $scope.docs; //??
          //$scope.defaultDoc = $scope.docs[0].alternateLink;
          //$scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
    });
    console.log('Documents List',$scope.docs);
  }

  $scope.clearDocs = function() {
    $scope.docs = []; // Clear out old results.
    //Inform angular we made changes?
  };

  $scope.fetchDocs = function(retry, folderId) {
    this.clearDocs();

    if (gdocs.accessToken) {
      var config = {
        params: {'alt': 'json', 'q': "mimeType contains 'spreadsheet' and '"+folderId+"' in parents"},
        headers: {
          'Authorization': 'Bearer ' + gdocs.accessToken
        }
      };

      $http.get(gdocs.DOCLIST_FEED, config).
        success(successCallbackWithFsCaching).
        error(function(data, status, headers, config) {
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken(
                gdocs.auth.bind(gdocs, true, 
                    $scope.fetchDocs.bind($scope, false)));
          }
        });
    }
  };

  $scope.fetchFolder = function(retry) {
    this.clearDocs();

    function successCallbackFolderId(resp, status, headers, config){
      var cats = [];

      var totalEntries = resp.items.length;

      resp.items.forEach(function(entry, i) {
        var cat = {
          title: entry.title,
          id: entry.id,
          updatedDate: Util.formatDate(entry.modifiedDate),
          alternateLink: entry.alternateLink,
        };
        $scope.cats.push(cat);
        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          //$scope.cats.sort(Util.sortByDate);
          //$scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
      });
      console.log('Folders',$scope.cats);
      $scope.fetchDocs(false, $scope.cats[0].id);
    }

    if (gdocs.accessToken) {
      var config = {
        params: {'alt': 'json', 'q': "mimeType contains 'folder' and title='Citable_Documents' and trashed!=true"},
        headers: {
          'Authorization': 'Bearer ' + gdocs.accessToken
        }
      };

      $http.get(gdocs.DOCLIST_FEED, config).
        success(successCallbackFolderId).
        error(function(data, status, headers, config) {
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken(
                gdocs.auth.bind(gdocs, true, 
                    $scope.fetchDocs.bind($scope, false)));
          }
        });
    }
  };

  // Toggles the authorization state.
  $scope.toggleAuth = function(interactive) {
    if (!gdocs.accessToken) {
      gdocs.auth(interactive, function() {
        $scope.fetchFolder(false);
        //$scope.fetchDocs(false);
      });
    } else {
      gdocs.revokeAuthToken(function() {});
      this.clearDocs();
    }
  }

  // Controls the label of the authorize/deauthorize button.
  $scope.authButtonLabel = function() {
    if (gdocs.accessToken)
      return 'Deauthorize';
    else
      return 'Authorize';
  };

  //Actually want to show the selector either way? No, on return of no docs (ie, startup) show the new doc name field and hide the loading wheel.
  //gotDocs is just part of this logic, it should also consider the state of the doc list query. 
  //On error, display error. On 200 OK evaluate doc list length.
  //Global variable with the state set. On callback success evaluate state and set global variable.
  $scope.gotDocs = function(index) {
    console.log('Docs length:',this.docs.length);
    if(this.docs.length > 0){
      return true;
    } else {
      return false;
    }
  }

  $scope.toggleMenu = function(){
    state.menu = !state.menu;
    
  }

  $scope.getMenu = function(){
    console.log(state.menu);
    return state.menu;
  }

  //Run toggleAuth when the constructor is called.
  $scope.toggleAuth(true);

  $scope.saveNote = function(){
    console.log('Save Note: ', state.getState());
  }

  $scope.updateDefault = function(dD){
    //$scope.$apply(function($scope) {}); // Inform angular we made changes.
    console.log('defaultDoc',dD);
    $scope.state.defaultDoc = dD; //update state service for message passing. is there a way to do this automatically?
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({'defaultDoc': $scope.state.defaultDoc}, function() {
      // Notify that we saved.
      //console.log('Settings saved');
      chrome.storage.sync.get('defaultDoc',function(items){console.log('storage.sync.get',items)});
    });
    console.log('defaultDoc',$scope.state.defaultDoc);
  }

  /*$scope.selectedOption = function(alternateLink){
    console.log('selectedOption',alternateLink, alternateLink == state.defaultDoc);
    return alternateLink == state.defaultDoc;
  }*/


} ]);


/*
citation:{
    note:'Select some text or type a note',
    url:'URL',
    author:'Enter an author',
    tags:'Enter some tags',
    title:'Enter a title'
  }
*/

//DocsController.$inject = ['$scope', '$http', 'gdocs']; // For code minifiers. Use this when not using closure syntax.




// Init setup and attach event listeners.
//document.addEventListener('DOMContentLoaded', function(e) {
  //var closeButton = document.querySelector('#close-button');
  //closeButton.addEventListener('click', function(e) {
    //window.close();
  //});
  
  //Use these to start the doc request on dom load.
  //angular.element(document.getElementById('controls')).scope().toggleAuth(true);
  //angular.element(document.getElementById('controls')).scope().$apply();
  
  // FILESYSTEM SUPPORT --------------------------------------------------------
  //window.webkitRequestFileSystem(TEMPORARY, 1024 * 1024, function(localFs) {
    //fs = localFs;
  //}, onError);
  // ---------------------------------------------------------------------------
//});

//End Closure
})();
