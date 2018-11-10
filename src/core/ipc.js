const nodeUtils = require('../common/utils');
const zmq = require('zeromq');
const EventEmitter = require('events').EventEmitter;
const constants = require('../common/constants');

class IpcClient extends EventEmitter {
  constructor(uri) {
    super();
    this._socket = zmq.socket('req');
    this._uri = uri;
    // map msg id's for sequential tasks
    // delete the callbacks after use.
    this._msgMapping = {};
    this._initContextListener();
  }
  connect() {
    this._socket.connect(this._uri);
    console.log('IPC connected to %s', this._uri );
  }
  disconnect() {
    this._socket.disconnect(this._uri);
  }
  sendJson(msg) {
    if (!nodeUtils.isString(msg)) {
      msg = JSON.stringify(msg);
    }
    this._socket.send(msg);
  }
  _initContextListener(){
    this._socket.on('message',(msg)=>{
      msg = JSON.parse(msg);
      let callback = this._msgMapping[msg.id];
      if(callback){
        callback(msg);
        // clear memory
        this._msgMapping[msg.id] = null;
      }
    });
  }
  sendJsonAndReceive(msg,callback){
    this._msgMapping[msg.id] = callback;
    if(!nodeUtils.isString(msg)){
      msg = JSON.stringify(msg);
    }
    this._socket.send(msg);
  }
  setResponseHandler(responseCallback) {
    this._socket.on('message', (msg)=>{
      msg = JSON.parse(msg);
      this.emit('message', msg);
      responseCallback(msg);
    });
  }
  /** MUST for runtime manager (main controller)*/
  type(){
    return constants.RUNTIME_TYPE.Core;
  }
  /** MUST for runtime manager (main controller)*/
  setChannel(communicator){
    //TODO::
  }
}

module.exports = IpcClient;

// /** mini test */
// const uri = 'tcp://127.0.0.1:5555';
// let client = new IpcClient(uri);
// client.setResponseHandler((msg)=>{
//   console.log("From Core %s", msg.s );
// });
//
// client.connect();
// client.sendJson({"yo":"susp??"});
//
