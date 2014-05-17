/**
 * @jsx React.DOM
 */
//var gdocs = new GDocs();
var docs= [{title:"test1",alternateLink:"url1"},{title:"test2",alternateLink:"url2"}];

var DocSelectControl = React.createClass({displayName: 'DocSelectControl',
	render: function(){
		var children = [];
	    for (var doc in this.props.docs) {
	    	console.log('Build Doc Select Options:',doc,this.props.docs);
	    	children.push(React.DOM.option( {value:"{doc.alternateLink}"}, doc.title));
	    }
	    return (
	    	React.DOM.select( {class:"Droid destination", name:"destination"}, 
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
    this.setState({docs: event.target.value});
  },
  render: function(){
    return (
        React.DOM.div(null, 
		    React.DOM.div( {className:"button Droid left controls menu"}),
			React.DOM.div( {className:"space selection"}, 
				React.DOM.img( {className:"loading", src:"css/img/loading.gif"}),
				DocSelectControl( {docs:this.props.docs})
			),
			React.DOM.div( {className:"button Droid note addNote"}, "Save")
		)
    );
  }
});

React.renderComponent(
  SelectionControls( {docs:docs}),
  document.getElementById('selection')
);
