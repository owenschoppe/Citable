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

// FILESYSTEM SUPPORT ----------------------------------------------------------
/*
var fs = null;
var FOLDERNAME = 'test';

function writeFile(blob) {
  if (!fs) {
    return;
  }

  fs.root.getDirectory(FOLDERNAME, {create: true}, function(dirEntry) {
    dirEntry.getFile(blob.name, {create: true, exclusive: false}, function(fileEntry) {
      // Create a FileWriter object for our FileEntry, and write out blob.
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onerror = onError;
        fileWriter.onwriteend = function(e) {
          console.log('Write completed.');
        };
        fileWriter.write(blob);
      }, onError);
    }, onError);
  }, onError);
}
*/
// -----------------------------------------------------------------------------

var gDriveApp = angular.module('gDriveApp', []);

gDriveApp.factory('gdocs', function() {
  console.log('run GDocs constructor');
  var gdocs = new GDocs();

  //Don't need DnD for this.
  /*var dnd = new DnDFileController('body', function(files) {
    var $scope = angular.element(this).scope();
    Util.toArray(files).forEach(function(file, i) {
      gdocs.upload(file, function() {
        $scope.fetchDocs(true);
      }, true);
    });
  });*/
  //console.log(gdocs);
  return gdocs;
});
//gDriveApp.service('gdocs', GDocs);
//gDriveApp.controller('DocsController', ['$scope', '$http', DocsController]);

// Main Angular controller for app.
//function DocsController($scope, $http, gdocs) { //Use this if not using closure.
gDriveApp.controller('DocsController', ['$scope', '$http', 'gdocs', function($scope, $http, gdocs){
  $scope.docs = [];
  $scope.cats = [];

  // Response handler that caches file icons in the filesystem API.
  function successCallbackWithFsCaching(resp, status, headers, config) {
    console.log(resp);

    var docs = [];

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

      // 'http://gstatic.google.com/doc_icon_128.png' -> 'doc_icon_128.png'
      //Don't need icons for this.
      /*doc.iconFilename = doc.icon.substring(doc.icon.lastIndexOf('/') + 1);

      // If file exists, it we'll get back a FileEntry for the filesystem URL.
      // Otherwise, the error callback will fire and we need to XHR it in and
      // write it to the FS.
      var fsURL = fs.root.toURL() + FOLDERNAME + '/' + doc.iconFilename;
      window.webkitResolveLocalFileSystemURL(fsURL, function(entry) {
        console.log('Fetched icon from the FS cache');

        doc.icon = entry.toURL(); // should be === to fsURL, but whatevs.

        $scope.docs.push(doc);

        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          $scope.docs.sort(Util.sortByDate);
          $scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
      }, function(e) {

        $http.get(doc.icon, {responseType: 'blob'}).success(function(blob) {
          console.log('Fetched icon via XHR');

          blob.name = doc.iconFilename; // Add icon filename to blob.

          writeFile(blob); // Write is async, but that's ok.

          doc.icon = window.URL.createObjectURL(blob);

          $scope.docs.push(doc);
          if (totalEntries - 1 == i) {
            $scope.docs.sort(Util.sortByDate);
          }
        });

      });*/
      $scope.docs.push(doc);
        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          $scope.docs.sort(Util.sortByDate);
          $scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
    });
    console.log('Documents List',$scope.docs);
  }

  $scope.clearDocs = function() {
    $scope.docs = []; // Clear out old results.
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
          $scope.$apply(function($scope) {}); // Inform angular we made changes.
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

  //Run toggleAuth when the constructor is called.
  $scope.toggleAuth(true);

} ]);

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
