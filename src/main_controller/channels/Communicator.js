const EventEmitter = require("events").EventEmitter;

class Communicator extends EventEmitter {
  constructor(otherCommunicator) {
    super();
    this._M = "m";
    this._other = otherCommunicator;
  }
  _setCommunicator(other) {
    this._other = other;
  }
  send(envelop) {
    if (envelop.id()) {
      this.emit(envelop.id(), envelop);
    } else {
      this.emit(this._M, envelop);
    }
  }
  sendAndReceive(envelop) {
    return new Promise((res, rej) => {
      // assumption: the responder will emit id() event
      this._other.on(envelop.id(), responseEnvelop => {
        res(responseEnvelop);
      });
      // emit the message
      this.emit(this._M, envelop);
    });
  }
  setOnMessage(callback) {
    this._other.on(this._M, envelop => {
      callback(envelop);
    });
  }
}

module.exports = Communicator;
//
// async function test(){
//
//   let c1 = new Communicator();
//   let c2 = new Communicator(c1);
//   c1._setCommunicator(c2);
//
//   let e = new Envelop(true,{"req":"123"});
//
//   c2.setOnMessage((envelop)=>{
//
//     if(envelop.id()){
//
//       c2.send(new Envelop(envelop.id(),{"res":"456"}));
//     }else{
//       console.log("w/e stateless");
//     }
//
//   });
//   let eRes = await c1.sendAndReceive(e);
//   console.log("got response => " + JSON.stringify(eRes.content()));
//   c1.send(new Envelop(false,{"stateless" : [1,2,3,4]}));
// }
//
// test();
