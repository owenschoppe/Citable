/**
 * @jsx React.DOM
 */
var gdocs = new GDocs();

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

      docs.push(doc);
        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          docs.sort(Util.sortByDate);
        }
    });
    console.log('Documents List',docs);
  }

fetchDocs = function(retry, folderId) {
    this.clearDocs();

    if (gdocs.accessToken) {
      var config = {
        params: {'alt': 'json', 'q': "mimeType contains 'spreadsheet' and '"+folderId+"' in parents"},
        headers: {
          'Authorization': 'Bearer ' + gdocs.accessToken
        }
      };

      //GDocs.prototype.makeRequest = function(method, url, callback, opt_params, opt_headers)

      /*$http.get(gdocs.DOCLIST_FEED, config).
        success(successCallbackWithFsCaching).
        error(function(data, status, headers, config) {
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken();
          }
        });*/
		
	gdocs.makeRequest('GET',gdocs.DOCLIST_FEED,successCallbackWithFsCaching,config.params);

    }
};

clearDocs = function() {
	docs = []; // Clear out old results.
};

toggleAuth = function(interactive) {
    if (!gdocs.accessToken) {
      gdocs.auth(interactive, function() {
        //$scope.fetchFolder(false);
        fetchDocs(false);
      });
    } else {
      gdocs.revokeAuthToken(function() {});
      this.clearDocs();
    }
  }

var docs= [{title:"test1",alternateLink:"url1"},{title:"test2",alternateLink:"url2"}];

var ActionMenu = React.createClass({displayName: 'ActionMenu',
	getInitialState: function(){
		return {printableLink: "printableURL", exportLink: "exportLink"};
	},
	render: function(){
		return (
			React.DOM.div(null, 
				React.DOM.a( {className:"viewDoc action"}, "view document"),
				React.DOM.div( {className:"menu_items menu"}, 
				React.DOM.div( {className:"divider"}),
				React.DOM.div( {className:"item"}, React.DOM.a( {className:"printDoc action", href:this.state.printableLink}, "print on post-its")),
				React.DOM.div( {className:"divider"}),
				React.DOM.div( {className:"item"}, React.DOM.a( {className:"exportDoc action", href:this.state.exportLink}, "export citations"))
				)
			)
		);
	}	
});

var DocSelectControl = React.createClass({displayName: 'DocSelectControl',
	getInitialState: function() {
	    var initSelect = this.props.docs.length?this.props.docs[0].alternateLink:'new';
	    console.log(this.props.docs[0]);
	    return {selected:initSelect};
    },
	handleChange: function(event){
		console.log('New Doc Selected:',event.target.value);
		this.setState({selected:event.target.value});
		this.props.changeDestination(event.target.value);
	},
	render: function(){
		var children = [];
	    for(var i in this.props.docs) {
	    	var doc = this.props.docs[i];
	    	console.log('Build Doc Select Options:',doc,this.props.docs,this.props.docs.length&&i==0);
	    	children.push(React.DOM.option( {key:i, value:doc.alternateLink}, doc.title));
	    }
	    //console.log(this.props.handleChanges(this));
	    return (
	    	React.DOM.select( {className:"Droid destination", name:"destination", onChange:this.handleChange, value:this.state.selected}, 
				React.DOM.option( {value:"new"}, "Create New Document"),
	    		children
	    	)	
	    );
	}
});

var SelectionControls = React.createClass({displayName: 'SelectionControls',
  render: function(){
  	console.log(this.props.docs.length);
    return (
        React.DOM.div(null, 
		    React.DOM.div( {className:"button Droid left controls menu"}),
			React.DOM.div( {className:"space selection", name:"selection"}, 
				React.DOM.img( {className:"loading", src:"css/img/loading.gif", hidden:this.props.docs.length?true:false} ),
				DocSelectControl( {docs:this.props.docs, changeDestination:this.props.changeDestination})
			),
			React.DOM.div( {className:"button Droid note addNote"}, "Save")
		)
    );
  }
});
//<div>{DocSelectControl.state.destination}</div>
var Controls = React.createClass({displayName: 'Controls',
  getInitialState: function() {
    toggleAuth();
    var dest = this.props.docs.length ? this.props.docs[0].alternativeLink : 'new';
    return {docs: [], destination:dest};
  },
  changeDestination: function(event) {
  	console.log('Parent handleChange',event);
    this.setState({destination: event});
  },
	render: function(){

		return (
			React.DOM.div(null, 
				
				React.DOM.label( {className:"selectionLabel indent note", for:"selection"}, "Save note in:"),
				React.DOM.div( {className:"new_doc_container", hidden:this.state.destination == 'new'?false:true}, 
				  React.DOM.div( {className:"indent"}, 
					  React.DOM.input( {type:"text", className:"doc_title", placeholder:"Enter a document title"} )
				  )
				),
				React.DOM.div( {className:"clear selection_box"}, 
					SelectionControls( {docs:this.props.docs, changeDestination:this.changeDestination})
				),
				React.DOM.div( {id:"action_box", className:"clear indent"}, 
					React.DOM.span( {id:"", className:"addNoteLabel note"}, "alt+return"),
					React.DOM.div( {className:"controls controlBar"}, 
						ActionMenu(null )
					)
				)
			)
		);
	}
});

React.renderComponent(
  Controls( {docs:docs}),
  document.getElementById('controls')
);
