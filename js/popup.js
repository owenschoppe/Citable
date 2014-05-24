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

//factory
gDriveApp.factory('sharedProps', sharedProps);

//factory constructor
function sharedProps() {
  //private variable
  var props = {};
  //set init values
  props.citation = {
    'note':'',
    'title':'',
    'author':'',
    'date':'',
    'url':'',
    'tags':''
  };
  props.menu = false;
  props.docs = [{
    'alternateLink': "https://docs.google.com/spreadsheet/ccc?key=0AkX20VUVZL5CdGZJWlVjR0tTRHVnVGZqSUZJOEEtMXc&usp=drivesdk",
    'icon': "https://ssl.gstatic.com/docs/doclist/images/icon_11_spreadsheet_list.png",
    'id': "0AkX20VUVZL5CdGZJWlVjR0tTRHVnVGZqSUZJOEEtMXc",
    'size': null,
    'title': "LTC Initial Secondary Research Links",
    'updatedDate': "5/13/14",
    'updatedDateFull': "2014-05-14T01:13:04.561Z"
  }, {
    'alternateLink': "https://docs.google.com/spreadsheets/d/1c0MTew5ivtnWhfSqXHUONyD83BG3xLmN1HAS4q-fVU0/edit?usp=drivesdk",
    'icon': "https://ssl.gstatic.com/docs/doclist/images/icon_11_spreadsheet_list.png",
    'id': "1c0MTew5ivtnWhfSqXHUONyD83BG3xLmN1HAS4q-fVU0",
    'size': null,
    'title': "Test Spreadsheet",
    'updatedDate': "5/7/14",
    'updatedDateFull': "2014-05-08T15:22:37.186Z"
  }];
  props.defaultDoc = '';
  props.butter = {'status':'', 'message':''};
  /*props.defaultMeta = props.docs.filter(function(el){
      return el.id == props.defaultDoc;
    });*/

  return {
    //public variable to expose private variable
    data: props
  };

}

//gDriveApp.service('gdocs', GDocs);
//gDriveApp.controller('DocsController', ['$scope', '$http', DocsController]);

gDriveApp.controller('CitationController', function($scope, sharedProps){
  
  var bgPage = chrome.extension.getBackgroundPage();

  $scope.data = sharedProps.data; //shared 2-way data binding to factory object
  
  $scope.getPageInfo = function(){
    bgPage.getPageInfo($scope.setCitation);
  }

  $scope.setCitation = function(pageInfo){
    console.log('setCitation',pageInfo);
    $scope.data.citation = pageInfo;
  }

  $scope.getPageInfo();

});

// Main Angular controller for app.
//function DocsController($scope, $http, gdocs) { //Use this if not using closure.
gDriveApp.controller('DocsController', function($scope, $http, gdocs, sharedProps){
  $scope.data = sharedProps.data; //shared 2-way data binding to factory object
  $scope.docs = $scope.data.docs; //Alias the docs prop for easy access. DOES NOT WORK
  $scope.cats = []; //Shared cats within controller

  var bgPage = chrome.extension.getBackgroundPage();

  //Retreive and update the defaultDoc based on local storage
  storageSuccess = function(items) {
    //update sharedProps values
    $scope.data.defaultDoc = items.defaultDoc;
    //$scope.updateMeta($scope.data.defaultDoc);
    console.log('Settings retrieved',items.defaultDoc,$scope.data.defaultDoc);
  }
  chrome.storage.sync.get('defaultDoc', storageSuccess);
  
  //Update the default meta any time the storage value changes.
  //We could also update the defaultDoc to guarantee everything stays in sync, but since we only trigger storage when we update it should be fine.
  //chrome.storage.onChanged.addListener(function(resp){$scope.updateMeta(resp.defaultDoc.newValue)});

  console.log('sharedProps on DocsController init',$scope.data);

  // Response handler that caches file icons in the filesystem API.
  function successCallbackWithFsCaching(resp, status, headers, config, statusText) {
    console.log('successCallbackWithFsCaching',resp,status,headers,config, statusText);

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
          $scope.data.docs = $scope.docs; //?? Aliasing didn't work, so we had to make an explicit redefinition.
          
          //$scope.defaultDoc = $scope.docs[0].alternateLink;
          //$scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
    });
    console.log('Documents List',$scope.docs);
    showMsg('Got Docs!');
  }

  //Displays message in butterBox with an optional class via status
  //Valid status: error.
  showMsg = function(message,status,delay){
    //Private function to clear the message after a set interval.
    clearMsg = function(delay){ 
      //console.log(delay);
      delay = delay != null ? delay : 1000;
      setTimeout(function(){
        $scope.data.butter = {'status':'','message':''};
        //console.log('clearMsg',$scope.data.butter);
        //TODO: Add fadout animation using ngAnimage and $animate?
        $scope.$apply(function($scope) {}); // Inform angular we made changes.
      },delay);
    }

    status = status !=null ? status : '';
    $scope.data.butter = {'status':status,'message':message};
    clearMsg(delay);
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
        error(function(data, status, headers, config, statusText) {
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken(
                gdocs.auth.bind(gdocs, true, 
                    $scope.fetchDocs.bind($scope, false)));
          } else {
            showMsg(status,'error');
          }
        });
    }
  };

  $scope.fetchFolder = function(retry) {
    this.clearDocs();

    function successCallbackFolderId(resp, status, headers, config, statusText){
      //var cats = []; //local cats

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
      //Get the files contained in the folder cats[0];
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
        error(function(data, status, headers, config, statusText) {
          
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken(
                gdocs.auth.bind(gdocs, true, 
                    $scope.fetchDocs.bind($scope, false)));
          } else {
            console.log('fetchFolder error',status);
            showMsg(status,'error');
          }
        });
    }
  };

  //Handler for saving a new citation.
  $scope.amendDoc = function(destination, callback) {
  console.log('gdocs.amendDoc..');
    
    destination = destination!=null ? destination : $scope.data.defaultDoc;
    //In the new scheme, new doc selected and no default on init are indistinguishable... this might be ok.
    if(destination.id == ''){
      //title = $.trim($('#doc_title').val());
      //createDoc(callback);
      return;
    } /*else if(destination == null && localStorage['defaultDoc']){ //If the doc menu isn't loaded yet, then try using the default doc.
            gdocs.amendDocHandler(localStorage['defaultDoc'], callback);   
        //TODO: create error in amendDocHandler to catch sending note to a document that doesn't exist.
    }*/ else{
      console.log('destination: ',destination.id,destination.title);
      amendDocHandler(destination.id, callback);
    }
  }

  amendDocHandler = function(docId, callback) {
  
    constructSpreadBody_ = function(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor) {            
      
      constructSpreadAtomXml_ = function(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor) {
  
        var d = new Date();
        var curr_date = d.getDate();
        var curr_month = d.getMonth() + 1; //months are zero based
        var curr_year = d.getFullYear();
        var dd = curr_year + '/' + curr_month + '/' + curr_date;
        
        var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
                  '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">',//'--END_OF_PART\r\n',
                    '<gsx:title>',entryTitle,'</gsx:title>',//'--END_OF_PART\r\n',
                    '<gsx:url>',entryUrl,'</gsx:url>',//'--END_OF_PART\r\n',
                    '<gsx:summary>',entrySummary,'</gsx:summary>',//'--END_OF_PART\r\n',
                    '<gsx:tags>',entryTags,'</gsx:tags>',
                    '<gsx:date>',dd,'</gsx:date>',
                    '<gsx:author>',entryAuthor,'</gsx:author>',
                    '</entry>'].join('');
        return atom;
      };

      parseForHTML = function(content) {
        //regular expression to find characters not accepted in XML.
          var rx= /(<)|(>)|(&)|(")|(')/g; 
        if(content == null){return null;}
        var content = content.replace(rx, function(m){
          switch(m)
          {
          case '<':
            return '&lt;';
            break;
          case '>':
            return '&gt;';
            break;
          case '&':
            return '&amp;';
            break;
          case '"':
            return '&quot;';
            break;
          case '\'':
            return '&apos;';
            break;
          default:
            return m;
            break;
          }
        });
        return content;
      }

      entryTitle = parseForHTML(entryTitle);
      entrySummary = parseForHTML(entrySummary);
      entryUrl = parseForHTML(entryUrl);
      entryTags = parseForHTML(entryTags);
      entryAuthor = parseForHTML(entryAuthor);
              
      var body = [
      constructSpreadAtomXml_(entryTitle, entryUrl, entrySummary, entryTags, entryAuthor), '\r\n',
      ].join('');
      
      return body;
    };

    var summary = $scope.data.citation.note;
    var title = $scope.data.citation.title;
    var url = $scope.data.citation.url;
    var tags = $scope.data.citation.tags;
    var author = $scope.data.citation.author;
      
    showMsg('Adding citable..');

    var handleSuccess = function(resp, status, headers, config, statusText) {
      console.log('gdocs.amendDoc handleSuccess');
      if (status != 201) {
        console.log('AMEND ERROR', resp);
        //gdocs.handleError(xhr, resp);
        //util.hideMsg();
        if(status == 400 || status == 500) { 
          console.log('Try updating headers: ',$scope.data.defaultDoc);
          //Try updating the column headers to fix faulty docs.
          //The second param is an optional doc so we don't update the whole list. We take the index of :selected and use just that doc from the docs array.
          
          bgPage.updateDocument(util.updateHeaderSuccess, $scope.data.defaultDoc);        
          showMsg('Updating Headers...');
        }; 
        return;
      } else {
        showMsg('Citable added!');
      
        requestFailureCount = 0;
        
        console.log('Ammend: ', resp, status);
        
        if(callback){callback();}
      }
    };
        
    /*var params = {
      'method': 'POST',
      'headers': {
        'GData-Version': '3.0',
        'Content-Type': 'application/atom+xml'
      },

      'body': gdocs.constructSpreadBody_(title, url, summary, tags, author)
      
    };*/

    /*
    <?xml version='1.0' encoding='UTF-8'?><entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended"><gsx:title></gsx:title><gsx:url></gsx:url><gsx:summary></gsx:summary><gsx:tags></gsx:tags><gsx:date>2014/5/24</gsx:date><gsx:author></gsx:author></entry>
    */
    
    if (gdocs.accessToken) {
      var data = constructSpreadBody_(title, url, summary, tags, author);
      data = data.trim().replace("^([\\W]+)<","<");

      var config = {
        //params: {},
        headers: {
          'Authorization': 'Bearer ' + gdocs.accessToken,
          'GData-Version': '3.0',
          'Content-Type': 'application/atom+xml'
        }//,
        //body: data
      };
      console.log('data to send',config,data)
      

      var worksheetId = 'od6';

      var url = bgPage.SPREAD_SCOPE +'/list/'+docId+'/'+worksheetId+'/private/full';

      $http.post(url, data, config).
          success(handleSuccess).
          error(function(data, status, headers, config, statusText) {
            
            if (status == 401 && retry) {
              gdocs.removeCachedAuthToken(
                  gdocs.auth.bind(gdocs, true, 
                      $scope.fetchDocs.bind($scope, false)));
            } else {
              console.log('amend note error',status,data);
              showMsg(statusText,'error');
            }
          });

      console.log('Citation: ', url, config);
    }
  };

  $scope.updateHeaderSuccess = function(){
    showMsg('Headers Updated!');
    amendDoc($scope.data.defaultDoc.id); //Resubmit the add note request.
  }

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
    console.log('Docs length:',$scope.docs.length>0);
    return ($scope.docs.length > 0);
  }

  $scope.toggleMenu = function(){
    $scope.data.menu = !$scope.data.menu;
    
  }

  $scope.getMenu = function(){
    return $scope.data.menu;
  }

  $scope.saveNote = function(){
    console.log('Save Note: ', $scope.data);
    saveNoteSuccess = function(){
      console.log('SaveNote success');
      //remove citation from log
      //window.close();
    }
    $scope.amendDoc($scope.data.defaultDoc,saveNoteSuccess);
  }
  
  $scope.viewDoc = function(destination, url) {
    console.log('viewDoc', destination, url);
    //First looks for the url passed in from the DocList API since that address should be correct. 
    var tabUrl = url != null ? url : constructURL(destination);
    chrome.tabs.create({url: tabUrl});
    window.close();

    function constructURL(destination) {
      if(destination == ''){ return null; }
      return 'https://docs.google.com/spreadsheet/ccc?key='+destination;
    }
  }

  $scope.storeDefault = function(){
    console.log('storeDefault',$scope.data.defaultDoc);
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set({'defaultDoc': $scope.data.defaultDoc}, function() {
      // Notify that we saved.
      chrome.storage.sync.get('defaultDoc',function(items){console.log('storage.sync.get',items)});
    });
    //If there is a change to the stored value, updateMeta gets triggered automatically.
  }

  /*$scope.updateMeta = function(docId) {
    $scope.data.defaultMeta = $scope.data.docs.filter(function(el){
      //return el.id == $scope.data.defaultDoc;
      return el.id == docId;
    });
    console.log('updateMeta', docId, $scope.data.defaultMeta);
    //do something with the current doc id.
  };*/

  //Run toggleAuth when the constructor is called to kick everything off.
  $scope.toggleAuth(true);
});

//End Closure
})();
