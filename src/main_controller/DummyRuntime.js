const Envelop = require("./channels/Envelop");

class DummyRuntime {
  constructor() {
    this._communicator = null;
  }
  setChannel(communicator) {
    this._communicator = communicator;
    this._communicator.setOnMessage(envelop => {
      console.log("DummyRuntime: got msg : " + JSON.stringify(envelop.content()));
    });
  }
  sendMsg(content) {
    const envelop = new Envelop(true, content, "dummy");
    console.log("sending id -> " + envelop.id());
    this._communicator.sendAndReceive(envelop).then(resEnv => {
      console.log("got response id -> " + resEnv.id());
      console.log("response content -> " + JSON.stringify(resEnv.content()));
    });
  }
  type() {
    return "dummy";
  }
}

module.exports = DummyRuntime;
