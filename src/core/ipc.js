const zmq = require('zmq');
class IpcClient{

  constructor(uri){
    this._socket = zmq.socket('req');
    this._uri = uri;
  }
  connect(){
    this._socket.connect(this._uri);
    console.log("IPC connected to %s", this._uri );
  }
  sendJson(msg){
    this._socket.send(msg);
  }
  setResponseHandler(responseCallback){
    this._socket.on('message',(msg)=>{
      responseCallback(msg);
    });
  }
}
const uri = 'tcp://127.0.0.1:5555';
let client = new IpcClient(uri);
client.setResponseHandler((msg)=>{
  console.log("From Core %s", msg );
});

client.connect();

client.sendJson(JSON.stringify({"yo":"sup??"}));
//////////////////////////////////////////////////////////
// let socket = zmq.socket('rep');
// socket.on('message',(msg)=>{
//   console.log("From Core %s", msg );
// });
// socket.connect('tcp://127.0.0.1:5555');
// console.log('Client connected to port 5555');
// // socket.send(JSON.stringify({"yo":"sup"}));
// socket.send(JSON.stringify({"MSG" : "HELLO"}));
//////////////////////////////////////////////////////////
//
// let socket = zmq.socket('req');
// socket.on('message', (msg)=>{
//   console.log("from server: " + msg.toString());
// });
// socket.connect('tcp://127.0.0.1:5555');
// console.log('Client connected to port 5555');
// socket.send(JSON.stringify({"MSG" : "HELLO"}));







