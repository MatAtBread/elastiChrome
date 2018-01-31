function EventEmitter(instance) {
    Object.defineProperty(this,"_listeners",{value:[]}) ;
    instance && Object.assign(this,instance) ;
}

EventEmitter.prototype.emit = function(event,data){
  var cb = [] ;
  for (var i=0;i<this._listeners.length;){
      if (event==this._listeners[i].event) {
          if (this._listeners[i].every) {
              cb.push(this._listeners[i++]) ;
          } else {
              cb.push(this._listeners.splice(i,1)[0]) ;
          }
      } else {
          i++ ;
      }
  }
  var ee = this ;
  function Nothing(){}
  Promise.resolve(true).then(function(){
      cb.forEach(function(l){
          try {
              if (l.cb && l.cb.handleEvent) {
                  l.cb.handleEvent({data:data,type:event,again:l.every?Nothing:function(){
                      ee.on(event,l.cb) ;
                  }});
              } else {
                  l.cb({data:data,type:event,again:l.every?Nothing:function(){
                      ee.on(event,l.cb) ;
                  }});
              }
          } catch(ex) {
              console.warn(ex,ex.stack) ;
          }
      }) ;
  }) ;
};

EventEmitter.prototype.on = function(event,cb){
    this._listeners.push({event:event,cb:cb}) ;
};

EventEmitter.prototype.addEventListener = function(event,cb){
    this._listeners.push({event:event,cb:cb,every:true}) ;
};

EventEmitter.prototype.removeEventListener = function(event,cb){
    for (var i=0;i<this._listeners.length;){
        if (this._listeners[i].every && event==this._listeners[i].event && cb===this._listeners[i].cb) {
            this._listeners.splice(i,1) ;
            return ;
        } else {
            i++ ;
        }
    }
    console.warn("EventEmitter.removeEventListener failed") ;
};

export default EventEmitter ;

