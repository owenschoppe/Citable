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

function GDocs(selector) {
    var SCOPE_ = "https://www.googleapis.com/drive/v2/";

    this.lastResponse = null;

    this.__defineGetter__("SCOPE", function () {
        return SCOPE_;
    });

    this.__defineGetter__("DOCLIST_FEED", function () {
        return SCOPE_ + "files";
    });

    this.__defineGetter__("CREATE_SESSION_URI", function () {
        return "https://www.googleapis.com/upload/drive/v2/files?uploadType=resumable";
    });

    this.__defineGetter__("DEFAULT_CHUNK_SIZE", function () {
        return 1024 * 1024 * 5; // 5MB;
    });

    const REDIRECT_URL = browser.identity.getRedirectURL();
    const { oauth2 } = browser.runtime.getManifest();
    const CLIENT_ID = oauth2.client_id;
    // const API_KEY = "AIzaSyAWw_FR8PovrAx8d4aJo2rJb3IY0Zfq91A";
    const SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/drive",
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/spreadsheets",
    ];
    const AUTH_URL = `https://accounts.google.com/o/oauth2/auth\
?client_id=${CLIENT_ID}\
&response_type=token\
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}\
&scope=${encodeURIComponent(SCOPES.join(" "))}`;
    const VALIDATION_BASE_URL =
        "https://www.googleapis.com/oauth2/v3/tokeninfo";
    this.REVOKE_URL = (token) =>
        `https://accounts.google.com/o/oauth2/revoke?token=${token}`;

    function extractParam(redirectUri, key) {
        let m = redirectUri.match(/[#?](.*)/);
        if (!m || m.length < 1) return null;
        let params = new URLSearchParams(m[1].split("#")[0]);
        return params.get(key);
    }

    /**
Validate the token contained in redirectURL.
This follows essentially the process here:
https://developers.google.com/identity/protocols/OAuth2UserAgent#tokeninfo-validation
- make a GET request to the validation URL, including the access token
- if the response is 200, and contains an "aud" property, and that property
matches the clientID, then the response is valid
- otherwise it is not valid

Note that the Google page talks about an "audience" property, but in fact
it seems to be "aud".
*/
    this.validate = (redirectURL) => {
        console.log("redirectURL", redirectURL);

        const accessToken = extractParam(redirectURL, "access_token");
        if (!accessToken) {
            throw "Authorization failure";
        }
        const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;
        const validationRequest = new Request(validationURL, {
            method: "GET",
        });

        function checkResponse(response) {
            return new Promise((resolve, reject) => {
                if (response.status != 200) {
                    reject("Token validation error");
                }
                response.json().then((json) => {
                    console.log("token info:", json);
                    if (json.aud && json.aud === CLIENT_ID) {
                        resolve({
                            access_token: accessToken,
                            exp: json.exp,
                            expires_in: extractParam(redirectURL, "expires_in"),
                            created: Date.now(),
                        });
                    } else {
                        reject("Token validation error");
                    }
                });
            });
        }

        return fetch(validationRequest).then(checkResponse);
    };

    /**
Authenticate and authorize using browser.identity.launchWebAuthFlow().
If successful, this resolves with a redirectURL string that contains
an access token.
*/
    this.authorize = (interactive) => {
        return browser.identity.launchWebAuthFlow({
            interactive: interactive,
            url: AUTH_URL,
        });
    };
}

GDocs.prototype.auth = function (interactive, opt_callback = () => {}) {
    // try {
    //     chrome.identity.getAuthToken(
    //         {
    //             interactive: interactive,
    //         },
    //         function (token) {
    //             if (token) {
    //                 this.accessToken = token;
    //                 console.log(token);
    //             }
    //             if (opt_callback) {
    //                 opt_callback(token);
    //             }
    //         }.bind(this)
    //     );
    // } catch (e) {
    //     console.log("Authorization Error", e);
    //     if (opt_callback) {
    //         opt_callback();
    //     }
    // }
    this.authorize(interactive)
        .then(this.validate)
        .then((tokenObject) => {
            this.accessToken = tokenObject.access_token;
            this.expiration = tokenObject.exp;
            return this.accessToken;
        })
        .then(opt_callback)
        .catch((error) => {
            console.log("Authorization Error", error);
            opt_callback();
        });
};

GDocs.prototype.removeCachedAuthToken = function (opt_callback = () => {}) {
    // if (this.accessToken) {
    //     var accessToken = this.accessToken;
    //     this.accessToken = null;
    //     // Remove token from the token cache.
    //     chrome.identity.removeCachedAuthToken(
    //         {
    //             token: accessToken,
    //         },
    //         function () {
    //             if (opt_callback) {
    //                 opt_callback();
    //             }
    //         }
    //     );
    // } else {
    //     if (opt_callback) {
    //         opt_callback();
    //     }
    // }
    this.authorize(false)
        .then(this.validate)
        .then((tokenObject) => {
            const revokeRequest = new Request(
                this.REVOKE_URL(tokenObject.access_token),
                { method: "POST" }
            );
            return fetch(revokeRequest).then((response) => response.ok);
        })
        .then((ok) => {
            this.accessToken = null;
            opt_callback();
        })
        .catch((error) => {
            console.log("Revocation Error", error);
            opt_callback();
        });
};

GDocs.prototype.revokeAuthToken = function (opt_callback) {
    if (this.accessToken) {
        // // Make a request to revoke token
        // var xhr = new XMLHttpRequest();
        // xhr.open(
        //     "GET",
        //     "https://accounts.google.com/o/oauth2/revoke?token=" +
        //         this.accessToken
        // );
        // xhr.send();
        // this.removeCachedAuthToken(opt_callback);
        this.authorize(false)
            .then(this.validate)
            .then((tokenObject) => {
                const revokeRequest = new Request(
                    this.REVOKE_URL(tokenObject.access_token),
                    { method: "POST" }
                );
                return fetch(revokeRequest).then((response) => response.ok);
            })
            .then((ok) => {
                this.accessToken = null;
                opt_callback();
            })
            .catch((error) => {
                console.log("Revocation Error", error);
                opt_callback();
            });
    }
};

/*
 * Generic HTTP AJAX request handler.
 */
GDocs.prototype.makeRequest = function (
    method,
    url,
    callback,
    opt_data,
    opt_headers
) {
    var data = opt_data || null;
    var headers = opt_headers || {};

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    // Include common headers (auth and version) and add rest.
    xhr.setRequestHeader("Authorization", "Bearer " + this.accessToken);
    for (var key in headers) {
        xhr.setRequestHeader(key, headers[key]);
    }

    xhr.onload = function (e) {
        console.log("onload", this, e.target);
        this.lastResponse = this.response;
        callback(e.target.response, e.target);
    }.bind(this);
    xhr.onerror = function (e) {
        console.log(
            this,
            this.status,
            this.response,
            this.getAllResponseHeaders()
        );
    };
    console.log("send data", xhr);
    xhr.send(data);
};

/**
 * Uploads a file to Google Docs.
 */
/*GDocs.prototype.upload = function(blob, callback, retry) {

  var onComplete = function(response) {
      document.getElementById('main').classList.remove('uploading');
      var entry = JSON.parse(response).entry;
      callback.apply(this, [entry]);
    }.bind(this);
  var onError = function(response) {
      if (retry) {
        this.removeCachedAuthToken(
            this.auth.bind(this, true,
                this.upload.bind(this, blob, callback, false)));
      } else {
        document.getElementById('main').classList.remove('uploading');
        throw new Error('Error: '+response);
      }
    }.bind(this);


  var uploader = new MediaUploader({
    token: this.accessToken,
    file: blob,
    onComplete: onComplete,
    onError: onError
  });

  document.getElementById('main').classList.add('uploading');
  uploader.upload();

};*/

/**
 * A generic error handler for failed XHR requests.
 * @param {XMLHttpRequest} xhr The xhr request that failed.
 * @param {string} textStatus The server's returned status.
 */
GDocs.handleError = function (xhr, textStatus) {
    //util.hideMsg();
    if (xhr.status != 0) {
        Util.displayError(xhr.status, " ", xhr.statusText);
    } else {
        Util.displayError("No internet connection.");
    }
    ++requestFailureCount;
};
