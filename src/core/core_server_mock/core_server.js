const zmq = require('zeromq');
const constants = require('../../common/constants');
const MsgTypes = constants.CORE_REQUESTS;
const Quote = 'AgAAANoKAAAHAAYAAAAAABYB+Vw5ueowf+qruQGtw+54eaWW7MiyrIAooQw/uU3eBAT/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAHAAAAAAAAALcVy53ugrfvYImaDi1ZW5RueQiEekyu/HmLIKYvg6OxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACD1xnnferKFHD2uvYqTXdDA8iZ22kCD5xw7h38CMfOngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGcCDM4cgbYe6zQSwWQINFsDvd21kXGeteDakovCXPDwjJ31WG0K+wyDDRo8PFi293DtIr6DgNqS/guQSkglPJqAIAALbvs91Ugh9/yhBpAyGQPth+UWXRboGkTaZ3DY8U+Upkb2NWbLPkXbcMbB7c3SAfV4ip/kPswyq0OuTTiJijsUyOBOV3hVLIWM4f2wVXwxiVRXrfeFs/CGla6rGdRQpFzi4wWtrdKisVK5+Cyrt2y38Ialm0NqY9FIjxlodD9D7TC8fv0Xog29V1HROlY+PvRNa+f2qp858w8j+9TshkvOAdE1oVzu0F8KylbXfsSXhH7d+n0c8fqSBoLLEjedoDBp3KSO0bof/uzX2lGQJkZhJ/RSPPvND/1gVj9q1lTM5ccbfVfkmwdN0B5iDA5fMJaRz5o8SVILr3uWoBiwx7qsUceyGX77tCn2gZxfiOICNrpy3vv384TO2ovkwvhq1Lg071eXAlxQVtPvRYOGgBAABydn7bEWdP2htRd46nBkGIAoNAnhMvbGNbGCKtNVQAU0N9f7CROLPOTrlw9gVlKK+G5vM1X95KTdcOjs8gKtTkgEos021zBs9R+whyUcs9npo1SJ8GzowVwTwWfVz9adw2jL95zwJ/qz+y5x/IONw9iXspczf7W+bwyQpNaetO9xapF6aHg2/1w7st9yJOd0OfCZsowikJ4JRhAMcmwj4tiHovLyo2fpP3SiNGzDfzrpD+PdvBpyQgg4aPuxqGW8z+4SGn+vwadsLr+kIB4z7jcLQgkMSAplrnczr0GQZJuIPLxfk9mp8oi5dF3+jqvT1d4CWhRwocrs7Vm1tAKxiOBzkUElNaVEoFCPmUYE7uZhfMqOAUsylj3Db1zx1F1d5rPHgRhybpNpxThVWWnuT89I0XLO0WoQeuCSRT0Y9em1lsozSu2wrDKF933GL7YL0TEeKw3qFTPKsmUNlWMIow0jfWrfds/Lasz4pbGA7XXjhylwum8e/I';
const DbUtils = require('../../common/DbUtils');
const DB_PROVIDER = require('./data/provider_db');
const ReceiverDb = require('./data/receiver_db');
const randomize = require('randomatic');

let socket;
let globalUri;
let isProvider = false;
let signKey = null;
let receiverScenario = 1;

module.exports.setProvider= (_isProvider)=>{
  isProvider = _isProvider;
};

module.exports.setReceiverScenario= (_receiverScenario)=>{
  receiverScenario = _receiverScenario;
};

module.exports.disconnect = ()=>{
  socket.disconnect(globalUri);
};
module.exports.runServer = (uri)=>{
  globalUri = uri;
  socket = zmq.socket('rep');
  socket.bindSync(uri);
  console.log('Server mock on %s ' , uri);

  socket.on('message', msg=>{
    msg = JSON.parse(msg);
    console.log("[Mock Server] got msg! ", msg.type);
    switch(msg.type){
      case MsgTypes.GetRegistrationParams:
        let response = getRegistrationParams(msg);
        send(socket,response);
        break;
      case MsgTypes.GetAllTips:
        let tips = getAllTips(msg);
        send(socket, tips);
        break;
      case MsgTypes.GetAllAddrs:
        let addrs = getAllAddrs(msg);
        send(socket, addrs);
        break;
      case MsgTypes.GetDeltas:
        let deltas = getDeltas(msg);
        send(socket,deltas);
        break;
      case MsgTypes.GetContract:
        let contract = getContract(msg);
        send(socket,contract);
        break;
      case MsgTypes.UpdateNewContract:
      case MsgTypes.UpdateDeltas:
        send(socket, {
          type : msg.type,
          id : msg.id,
          success : true
        });
        break;
      case MsgTypes.NewTaskEncryptionKey:
        let encKeyMsg = getNewTaskEncryptionKey(msg);
        send(socket,encKeyMsg);
        break;
    }
  });

};


function send(socket,msg){
  let error = {"error" : "from server error"};
  if(msg){
    socket.send(JSON.stringify(msg));
  }else{
    socket.send(JSON.stringify(error));
  }
}


function getNewTaskEncryptionKey(msg){
  if(signKey === null){
    signKey = randomize('Aa0',40 );
  }
  return{
    id : msg.id,
    type : msg.type,
    senderKey : signKey,
    msgId : randomize('Aa0',12),
    workerEncryptionKey : '0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47',
    workerSig : 'worker-signature-with-signed-by-the-private-key-of-the-sender-key'
  };
}


function getContract(msg){
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
function getDeltas(msg){
  let response = [];
  let input = msg.input;
  let reqAddrs = input.map(r=>{
    return r.address;
  });
  let inputMap = {};
  input.forEach(r=>{
    inputMap[r.address] = r;
  });
  DB_PROVIDER.forEach(entry=>{
    let dbAddr = DbUtils.toHexString(entry.address);
    let dbIndex = entry.key;
    if(inputMap[dbAddr]){
      let from = inputMap[dbAddr].from;
      let to = inputMap[dbAddr].to;
      if(dbIndex >= from && dbIndex <= to){
        response.push({
          address : dbAddr,
          key : dbIndex,
          data : entry.delta,
        });
      }
    }
  });
  return {
    type : msg.type,
    id : msg.id,
    deltas : response
  }
}


function getAllAddrs(msg){
  let addresses;
  if(isProvider){
    addresses = DB_PROVIDER.map(o=>{
      if(o.key < 0){
        return DbUtils.toHexString(o.address);
      }else{
        return [];
      }
    }).filter(o=>{
      return o.length > 0;
    });
  }else{
    addresses = ReceiverDb.getTips(receiverScenario).map(tip=>{
      return DbUtils.toHexString(tip.address);
    });
  }
  return {
    type : msg.type,
    id : msg.id,
    addresses : addresses
  }
}
function getAllTips(msg){
  return {
    type : msg.type,
    id : msg.id,
    tips : ReceiverDb.getTips(receiverScenario)
  }
}
function getRegistrationParams(msg) {
  if(signKey === null){
    signKey = randomize('Aa0',40 );
  }
  return {
    type: msg.type,
    id: msg.id,
    signingKey: signKey,
    quote: Quote
  }
}
