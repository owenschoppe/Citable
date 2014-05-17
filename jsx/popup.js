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

var ActionMenu = React.createClass({
	getInitialState: function(){
		return {printableLink: "printableURL", exportLink: "exportLink"};
	},
	render: function(){
		return (
			<div>
				<a className="viewDoc action">view document</a>
				<div className="menu_items menu">
				<div className="divider"></div>
				<div className="item"><a className="printDoc action" href={this.state.printableLink}>print on post-its</a></div>
				<div className="divider"></div>
				<div className="item"><a className="exportDoc action" href={this.state.exportLink}>export citations</a></div>
				</div>
			</div>
		);
	}
});

var DocSelectControl = React.createClass({
	/*getInitialState: function() {
	    return {destination:[]};
    },
	handleChange: function(event){
		console.log('New Doc Selected:',event,event.target.value);
		this.setState({destination: event.target.value});
	},*/
	render: function(){
		var children = [];
	    for(var i in this.props.docs) {
	    	var doc = this.props.docs[i];
	    	console.log('Build Doc Select Options:',doc,this.props.docs);
	    	children.push(<option key={i} value={doc.alternateLink}>{doc.title}</option>);
	    }
	    console.log(this.props.handleChange);
	    return (
	    	<select className="Droid destination" name="destination" onChange={this.props.handleChange(this)}>
				<option value="new">Create New Document</option>
	    		{children}
	    	</select>	
	    );
	}
});

var SelectionControls = React.createClass({
  getInitialState: function() {
    
    return {docs: [], destination:""};
  },
  handleChange: function(event) {
  	console.log('Parent handleChange',event);
    //this.setState({destination: event.target});
  },
  render: function(){
    return (
        <div>
		    <div className="button Droid left controls menu"></div>
			<div className="space selection" name="selection">
				<img className="loading" src="css/img/loading.gif"/>
				<DocSelectControl docs={this.props.docs} handleChange={this.handleChange}/>
			</div>
			<div className="button Droid note addNote">Save</div>
		</div>
    );
  }
});
//<div>{DocSelectControl.state.destination}</div>
var Controls = React.createClass({
	render: function(){
		return (
			<div>
				
				<label className="selectionLabel indent note" for="selection">Save note in:</label>
				<div className="new_doc_container">
				  <div className="indent">
					  <input type="text" className="doc_title" placeholder="Enter a document title" />
				  </div>
				</div>
				<div className="clear selection_box">
					<SelectionControls docs={this.props.docs}/>
				</div>
				<div id="action_box" className="clear indent">
					<span id="" className="addNoteLabel note">alt+return</span>
					<div className="controls controlBar">
						<ActionMenu />
					</div>
				</div>
			</div>
		);
	}
});

React.renderComponent(
  <Controls docs={docs}/>,
  document.getElementById('controls')
);
