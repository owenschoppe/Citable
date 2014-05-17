/**
 * @jsx React.DOM
 */

function computeBallmerPeak(x) {
  // see: http://ask.metafilter.com/76859/Make-a-function-of-this-graph-Thats-like-an-antigraph
  x = x * 100;
  return (
    1-1/(1+Math.exp(-(x-6)))*.5 + Math.exp(-Math.pow(Math.abs(x-10), 2)*10)
  ) / 1.6;
}

var BallmerPeakCalculator = React.createClass({displayName: 'BallmerPeakCalculator',
  getInitialState: function() {
    return {bac: 0};
  },
  handleChange: function(event) {
    this.setState({bac: event.target.value});
  },
  render: function() {
    var pct = computeBallmerPeak(this.state.bac);
    if (isNaN(pct)) {
      pct = 'N/A';
    } else {
      pct = (100 - Math.round(pct * 100)) + '%';
    }
    return (
      React.DOM.div(null, 
        React.DOM.img( {src:"./ballmer_peak.png"} ),
        React.DOM.p(null, "Credit due to ", React.DOM.a( {href:"http://xkcd.com/323/"}, "xkcd"),"."),
        React.DOM.h4(null, "Compute your Ballmer Peak:"),
        React.DOM.p(null, 
          "If your BAC is",' ',
          React.DOM.input( {type:"text", onChange:this.handleChange, value:this.state.bac} ),
          ', ',"then ", React.DOM.b(null, pct), " of your lines of code will have bugs."
        )
      )
    );
  }
});

React.renderComponent(
  BallmerPeakCalculator(null ),
  document.getElementById('selection')
);
