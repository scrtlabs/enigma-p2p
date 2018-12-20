const zmq = require('zeromq');
const constants = require('../../common/constants');
const MsgTypes = constants.CORE_REQUESTS;
const Quote = 'AgAAANoKAAAHAAYAAAAAABYB+Vw5ueowf+qruQGtw+54eaWW7MiyrIAooQw/uU3eBAT/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAHAAAAAAAAALcVy53ugrfvYImaDi1ZW5RueQiEekyu/HmLIKYvg6OxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACD1xnnferKFHD2uvYqTXdDA8iZ22kCD5xw7h38CMfOngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGcCDM4cgbYe6zQSwWQINFsDvd21kXGeteDakovCXPDwjJ31WG0K+wyDDRo8PFi293DtIr6DgNqS/guQSkglPJqAIAALbvs91Ugh9/yhBpAyGQPth+UWXRboGkTaZ3DY8U+Upkb2NWbLPkXbcMbB7c3SAfV4ip/kPswyq0OuTTiJijsUyOBOV3hVLIWM4f2wVXwxiVRXrfeFs/CGla6rGdRQpFzi4wWtrdKisVK5+Cyrt2y38Ialm0NqY9FIjxlodD9D7TC8fv0Xog29V1HROlY+PvRNa+f2qp858w8j+9TshkvOAdE1oVzu0F8KylbXfsSXhH7d+n0c8fqSBoLLEjedoDBp3KSO0bof/uzX2lGQJkZhJ/RSPPvND/1gVj9q1lTM5ccbfVfkmwdN0B5iDA5fMJaRz5o8SVILr3uWoBiwx7qsUceyGX77tCn2gZxfiOICNrpy3vv384TO2ovkwvhq1Lg071eXAlxQVtPvRYOGgBAABydn7bEWdP2htRd46nBkGIAoNAnhMvbGNbGCKtNVQAU0N9f7CROLPOTrlw9gVlKK+G5vM1X95KTdcOjs8gKtTkgEos021zBs9R+whyUcs9npo1SJ8GzowVwTwWfVz9adw2jL95zwJ/qz+y5x/IONw9iXspczf7W+bwyQpNaetO9xapF6aHg2/1w7st9yJOd0OfCZsowikJ4JRhAMcmwj4tiHovLyo2fpP3SiNGzDfzrpD+PdvBpyQgg4aPuxqGW8z+4SGn+vwadsLr+kIB4z7jcLQgkMSAplrnczr0GQZJuIPLxfk9mp8oi5dF3+jqvT1d4CWhRwocrs7Vm1tAKxiOBzkUElNaVEoFCPmUYE7uZhfMqOAUsylj3Db1zx1F1d5rPHgRhybpNpxThVWWnuT89I0XLO0WoQeuCSRT0Y9em1lsozSu2wrDKF933GL7YL0TEeKw3qFTPKsmUNlWMIow0jfWrfds/Lasz4pbGA7XXjhylwum8e/I';
const DbUtils = require('../../common/DbUtils');
const DB_PROVIDER = require('./data/provider_db');
const ReceiverDb = require('./data/receiver_db');
const randomize = require('randomatic');


class MockCoreServer {
  constructor() {
    this._socket = null;
    this._uri = null;
    this._isProvider = false;
    this._signKey = null;
    this._receiverScenario = 1;
  }

  setProvider(isProvider) {
    this._isProvider = isProvider;
  };

  setReceiverScenario(receiverScenario) {
    this._receiverScenario = receiverScenario;
  };

  disconnect() {
    this._socket.disconnect(this._uri);
  };

  runServer(uri) {
    this._uri = uri;
    this._socket = zmq.socket('rep');
    this._socket.bindSync(uri);
    console.log('Server mock on %s ' , uri);

    this._socket.on('message', (msg)=>{
      msg = JSON.parse(msg);
      console.log('[Mock Server] got msg! ', msg.type);
      switch(msg.type){
        case MsgTypes.GetRegistrationParams:
          let response = this._getRegistrationParams(msg);
          MockCoreServer._send(this._socket, response);
          break;
        case MsgTypes.GetAllTips:
          let tips = this._getAllTips(msg);
          MockCoreServer._send(this._socket, tips);
          break;
        case MsgTypes.GetAllAddrs:
          let addrs = this._getAllAddrs(msg);
          MockCoreServer._send(this._socket, addrs);
          break;
        case MsgTypes.GetDeltas:
          let deltas = MockCoreServer._getDeltas(msg);
          MockCoreServer._send(this._socket, deltas);
          break;
        case MsgTypes.GetContract:
          let contract = MockCoreServer._getContract(msg);
          MockCoreServer._send(this._socket, contract);
          break;
        case MsgTypes.UpdateNewContract:
        case MsgTypes.UpdateDeltas:
          MockCoreServer._send(this._socket, {
            type : msg.type,
            id : msg.id,
            success : true
          });
          break;
        case MsgTypes.NewTaskEncryptionKey:
          let encKeyMsg = MockCoreServer._getNewTaskEncryptionKey(msg);
          MockCoreServer._send(MockCoreServer._socket, encKeyMsg);
          break;
      }
    });
  };

  static _send(socket, msg){
    let error = {"error" : "from server error"};
    if(msg){
      socket.send(JSON.stringify(msg));
    }else{
      socket.send(JSON.stringify(error));
    }
  }

  _getNewTaskEncryptionKey(msg){
    if (this._signKey === null){
      this._signKey = randomize('Aa0',40 );
    }
    return{
      id : msg.id,
      type : msg.type,
      senderKey : this._signKey,
      msgId : randomize('Aa0',12),
      workerEncryptionKey : '0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47',
      workerSig : 'worker-signature-with-signed-by-the-private-key-of-the-sender-key'
    };
  }


  static _getContract(msg){
    let bcode = null;
    let contractAddr = null;
    DB_PROVIDER.forEach(entry=>{
      if(msg.input[0] === DbUtils.toHexString(entry.address) && entry.key === -1){
        bcode = entry.delta;
        contractAddr = DbUtils.toHexString(entry.address);
      }
    });
    return {
      type : msg.type,
      id : msg.id,
      address : contractAddr,
      bytecode : bcode
    }
  }

//input = [{address, from:key,to:key},...]
//response deltas : [{address,key,data},...]
  static _getDeltas(msg) {
    let response = [];
    let input = msg.input;
    let reqAddrs = input.map(r => {
      return r.address;
    });
    let inputMap = {};
    input.forEach(r => {
      inputMap[r.address] = r;
    });
    DB_PROVIDER.forEach(entry => {
      let dbAddr = DbUtils.toHexString(entry.address);
      let dbIndex = entry.key;
      if (inputMap[dbAddr]) {
        let from = inputMap[dbAddr].from;
        let to = inputMap[dbAddr].to;
        if (dbIndex >= from && dbIndex <= to) {
          response.push({
            address: dbAddr,
            key: dbIndex,
            data: entry.delta,
          });
        }
      }
    });
    return {
      type: msg.type,
      id: msg.id,
      deltas: response
    }
  }
  _getAllAddrs(msg){
    let addresses;
    if (this._isProvider) {
      addresses = DB_PROVIDER.map(o=>{
        if(o.key < 0){
          return DbUtils.toHexString(o.address);
        }else{
          return [];
        }
      }).filter(o=>{
        return o.length > 0;
      });
    } else{
      addresses = ReceiverDb.getTips(this._receiverScenario).map(tip=>{
        return DbUtils.toHexString(tip.address);
      });
    }
    return {
      type: msg.type,
      id: msg.id,
      addresses: addresses
    }
  }
  _getAllTips(msg){
    return {
      type: msg.type,
      id: msg.id,
      tips: ReceiverDb.getTips(this._receiverScenario)
    }
  }
  _getRegistrationParams(msg) {
    if (this._signKey === null){
      this._signKey = randomize('Aa0',40 );
    }
    return {
      type: msg.type,
      id: msg.id,
      signingKey: this._signKey,
      quote: Quote
    }
  }
}

module.exports = MockCoreServer;

