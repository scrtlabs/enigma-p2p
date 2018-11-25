const jayson = require('jayson');

class JsonRpcServer{
  constructor(config){
    this._port = config.port;
    this._server = jayson.server({
      add : (args,callback)=>{
        callback(null,args[0]+ args[1]);
      }
    });
  }
  listen(){
    this._server.tcp().listen(this._port);
  }
}
