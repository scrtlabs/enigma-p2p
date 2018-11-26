/**
 * This class is responsible for interacting with users.
 * i.e if this node is also a proxy node then it can connect to dApp users.
 * and do stuff like: broadcast computeTask, get other workers PubKey etc.
 * */
const jayson = require('jayson');
class QuoteAction{}

class JsonRpcServer{

  constructor(config){
    this._port = config.port;
    this._peerId = config.peerId;
    this._pendingSequence = {};
    this._server = jayson.server({
      say_hi : (args,callback)=>{
        callback(null,"Hi from %s" , this._peerId);
      },
      getQuote : (args,callback)=>{
        new QuoteAction(this,args,callback);
      },
      sequence_hello : (args,callback)=>{
        let msg_id = args[0]
        // do stuff
        // send back with sequence id
        this._pendingSequence[msg_id] = [args[1]];
      }
    });
  }
  listen(){
    this._server.tcp().listen(this._port);
  }
}
