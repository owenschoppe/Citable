/**
 * @jsx React.DOM
 */
var gdocs = new GDocs();

fetchDocs = function(retry, folderId) {
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
            gdocs.removeCachedAuthToken();
          }
        });
    }
};

clearDocs = function() {
	docs = []; // Clear out old results.
};

var docs= [{title:"test1",alternateLink:"url1"},{title:"test2",alternateLink:"url2"}];

var ActionMenu = React.createClass({displayName: 'ActionMenu',
	getInitialState: function(){
		return {printableLink: "printableURL", exportLink: "exportLink"};
	},
	render: function(){
		React.DOM.div(null, 
			React.DOM.a( {className:"viewDoc action"}, "view document"),
			React.DOM.div( {className:"menu_items menu"}, 
			React.DOM.div( {className:"divider"}),
			React.DOM.div( {className:"item"}, React.DOM.a( {className:"printDoc action", href:this.state.printableLink}, "print on post-its")),
			React.DOM.div( {className:"divider"}),
			React.DOM.div( {className:"item"}, React.DOM.a( {className:"exportDoc action", href:this.state.exportLink}, "export citations"))
			)
		)
	}
});

var DocSelectControl = React.createClass({displayName: 'DocSelectControl',
	render: function(){
		var children = [];
	    for (var i in this.props.docs) {
	    	var doc = this.props.docs[i];
	    	console.log('Build Doc Select Options:',doc,this.props.docs);
	    	children.push(React.DOM.option( {value:"{doc.alternateLink}"}, doc.title));
	    }
	    return (
	    	React.DOM.select( {className:"Droid destination", name:"destination"}, 
				React.DOM.option( {value:"new"}, "Create New Document"),
	    		children
	    	)	
	    );
	}
});

var SelectionControls = React.createClass({displayName: 'SelectionControls',
  getInitialState: function() {
    
    return {docs: [], destination:""};
  },
  handleChange: function(event) {
    this.setState({destination: event.target.value});
  },
  render: function(){
    return (
        React.DOM.div(null, 
		    React.DOM.div( {className:"button Droid left controls menu"}),
			React.DOM.div( {className:"space selection", name:"selection"}, 
				React.DOM.img( {className:"loading", src:"css/img/loading.gif"}),
				DocSelectControl( {docs:this.props.docs})
			),
			React.DOM.div( {className:"button Droid note addNote"}, "Save")
		)
    );
  }
});

var Controls = React.createClass({displayName: 'Controls',
	render: function(){
		React.DOM.div(null, 
			React.DOM.label( {className:"selectionLabel indent note", for:"selection"}, "Save note in:"),
			React.DOM.div( {className:"new_doc_container"}, 
			  React.DOM.div( {className:"indent"}, 
				  React.DOM.input( {type:"text", className:"doc_title", placeholder:"Enter a document title"} )
			  )
			),
			React.DOM.div( {className:"clear selection_box"}, 
				SelectionControls( {docs:this.props.docs})
			),
			React.DOM.div( {id:"action_box", className:"clear indent"}, 
				React.DOM.span( {id:"", className:"addNoteLabel note"}, "alt+return"),
				React.DOM.div( {className:"controls controlBar"}, 
					ActionMenu(null )
				)
			)
		)
	}
});

React.renderComponent(
  Controls( {docs:docs}),
  document.getElementById('selection_box')
);
