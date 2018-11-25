/**
 * This class is responsible for interacting with users.
 * i.e if this node is also a proxy node then it can connect to dApp users.
 * and do stuff like: broadcast computeTask, get other workers PubKey etc.
 * */
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
