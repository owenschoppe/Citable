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

var Util = Util || {};

// Combines two JSON objects in one.
Util.merge = function(obj1, obj2) {
  var obj = {};

  for (var x in obj1) {
    if (obj1.hasOwnProperty(x)) {
      obj[x] = obj1[x];
    }
  }

  for (var x in obj2) {
    if (obj2.hasOwnProperty(x)) {
      obj[x] = obj2[x];
    }
  }

  return obj;
};

/**
 * Turns a NodeList into an array.
 *
 * @param {NodeList} list The array-like object.
 * @return {Array} The NodeList as an array.
 */
Util.toArray = function(list) {
  return Array.prototype.slice.call(list || [], 0);
};

/**
 * Urlencodes a JSON object of key/value query parameters.
 * @param {Object} parameters Key value pairs representing URL parameters.
 * @return {string} query parameters concatenated together.
 */
Util.stringify = function(parameters) {
  var params = [];
  for (var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
      encodeURIComponent(parameters[p]));
  }
  return params.join('&');
};

/**
 * Creates a JSON object of key/value pairs
 * @param {string} paramStr A string of Url query parmeters.
 *    For example: max-results=5&startindex=2&showfolders=true
 * @return {Object} The query parameters as key/value pairs.
 */
Util.unstringify = function(paramStr) {
  var parts = paramStr.split('&');

  var params = {};
  for (var i = 0, pair; pair = parts[i]; ++i) {
    var param = pair.split('=');
    params[decodeURIComponent(param[0])] = decodeURIComponent(param[1]);
  }
  return params;
};

/**
 * Utility for formatting a date string.
 * @param {string} msg The date in UTC format. Example: 2010-04-01T08:00:00Z.
 * @return {string} The date formated as mm/dd/yy. Example: 04/01/10.
 */
Util.formatDate = function(dateStr) {
  var date = new Date(dateStr.split('T')[0]);
  return [date.getMonth() + 1, date.getDate(),
    date.getFullYear().toString().substring(2)
  ].join('/');
};

/**
 * Utility for formatting a Date object as a string in ISO 8601 format using UTC.
 * @param {Date} d The date to format.
 * @return {string} The formated date string in ISO 8601 format.
 */
Util.ISODateString = function(d) {
  var pad = function(n) {
    return n < 10 ? '0' + n : n;
  };
  return d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + ':' +
    pad(d.getUTCMinutes()) + ':' +
    pad(d.getUTCSeconds()); // + 'Z'
};

/**
 * Formats a string with the given parameters. The string to format must have
 * placeholders that correspond to the index of the arguments passed and surrounded
 * by curly braces (e.g. 'Some {0} string {1}').
 *
 * @param {string} var_args The string to be formatted should be the first
 *     argument followed by the variables to inject into the string
 * @return {string} The string with the specified parameters injected
 */
Util.format = function(var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return var_args.replace(/\{(\d+)\}/g, function(m, i) {
    return args[i];
  });
};

Util.sortByDate = function(a, b) {
  if (a.updatedDateFull < b.updatedDateFull) {
    return 1;
  }
  if (a.updatedDateFull > b.updatedDateFull) {
    return -1;
  }
  return 0;
}

Util.sortByTitle = function(a, b) {
  if (a.title < b.title) {
    return 1;
  }
  if (a.title > b.title) {
    return -1;
  }
  return 0;
};

Util.escapeHTML = function(content) {
  //Use browsers built-in functionality to quickly and safely escape strings.
  var div = document.createElementNS('http://www.w3.org/199/xhtml', 'div');
  div.appendChild(document.createTextNode(content));
  return div.innerHTML;
};

Util.encodeURLParam = function(content) {
  return encodeURIComponent(component).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
};

Util.parseForHTML = function(content) {
  //regular expression to find characters not accepted in XML.
  var rx = /(<)|(>)|(&)|(")|(')/g;
  if (content == null) {
    return '';
  }
  content = content.replace(rx, function(m) {
    switch (m) {
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
  return sanitizeStringForXML(content);
};

// WARNING: too painful to include supplementary planes, these characters (0x10000 and higher)
// will be stripped by this function. See what you are missing (heiroglyphics, emoji, etc) at:
// http://en.wikipedia.org/wiki/Plane_(Unicode)#Supplementary_Multilingual_Plane
var NOT_SAFE_IN_XML_1_0 = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;

function sanitizeStringForXML(theString) {
  "use strict";
  return theString.replace(NOT_SAFE_IN_XML_1_0, '');
}

function removeInvalidCharacters(node) {
  "use strict";

  if (node.attributes) {
    for (var i = 0; i < node.attributes.length; i++) {
      var attribute = node.attributes[i];
      if (attribute.nodeValue) {
        attribute.nodeValue = sanitizeStringForXML(attribute.nodeValue);
      }
    }
  }
  if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var childNode = node.childNodes[i];
      if (childNode.nodeType == 1 /* ELEMENT_NODE */ ) {
        removeInvalidCharacters(childNode);
      } else if (childNode.nodeType == 3 /* TEXT_NODE */ ) {
        if (childNode.nodeValue) {
          childNode.nodeValue = sanitizeStringForXML(childNode.nodeValue);
        }
      }
    }
  }
}

// JSON to CSV Converter
//TODO: use "for(var i in o){console.log(i,o[i]);}" to traverse a single object instead of an array of objects. i=key o[1]=value
// Accepts an object array in the form of [{a:1,b:2},{a:3,b:4},...] -> "a,b \r\n 1,2 \r\n 3,4"
Util.JSONToCSV = function(objArray) {
  console.log('JSON objArray:', objArray);
  var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray; //Insures that the incoming param is an object array.
  //var header = array.length > 1 ? array[0] : array;
  var str = Object.keys(array[0]) + '\r\n'; //Uses the first object in the array to get the column headers.
  for (var i = 0; i < array.length; i++) {
    var line = '';
    for (var index in array[i]) {
      if (line != '') line += ',';
      console.log('line', i, array[i][index], line);
      line += '"' + Util.parseForHTML(array[i][index]) + '"'; //Add the HTML parsed value of the citation to the CSV line.
    }
    str += line + '\r\n';
  }
  console.log('CSV data:', str);
  return str;
};

/**
 * Utility for displaying a message to the user.
 * @param {string} msg The message.
 */
Util.displayMsg = function(msg) {
  document.querySelector('#butter').classList.remove('error').innerText = (msg);
};

/**
 * Utility for removing any messages currently showing to the user.
 */
Util.hideMsg = function() {
  document.querySelector('#butter').innerText = ('');
};

/**
 * Utility for displaying an error to the user.
 * @param {string} msg The message.
 */
Util.displayError = function(msg) {
  Util.displayMsg(msg);
  document.querySelector('#butter').classList.add('error').innerText = (msg);
};

/**
 * Sets up a future poll for the user's document list.
 */
Util.scheduleRequest = function(request) {
  var exponent = Math.pow(2, requestFailureCount);
  var delay = Math.min(pollIntervalMin * exponent, pollIntervalMax);
  delay = Math.round(delay);
  chrome.runtime.getBackgroundPage(function(ref) {
    ref.toggleAuth(true, function() {
      var req = ref.window.setTimeout(function() {
        // gdocs.getDocumentList(); //Get the first folder, no callback.
        // util.scheduleRequest();
        request();
      }, delay);
      requests.push(req);
      //req();
    });
  });
};
