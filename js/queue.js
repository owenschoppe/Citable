//-------------//
// Queue Class //
//-------------//

//Queue class, to be used by any service in need of a queue.
//This class is completely abstracted and doesn't know anything about the functions being passed in.
//The implementing service must submit functions which accept a callback wrapped in an anonymous function. 
var Queue = (function(){

    function Queue() {}

    Queue.prototype.running = false;

    Queue.prototype.queue = [];

    //Incoming functions must be of the form: function(callback,extraparams){privateFn(callback,params,extraparams)}
    Queue.prototype.add_function = function(fn){
      this.queue.push(fn);
      //If nothing is running, kick off the queue.
      if(this.running === false){
        this.next();
      }
    };

    Queue.prototype.next = function(){
        var self = this;
        //Wrap next function in a closure to make the reference accessible from the callback.
        (function next() {
          if(self.queue.length > 0) {
            console.log('queue.next',self.queue.length);
            self.running = true;
            self.queue.shift().apply(this, [next].concat(Array.prototype.slice.call(arguments, 0)));
          } else {
            console.log('queue.next',self.queue.length);
            self.running = false;
          }
        })();
    };

    return Queue;

})();