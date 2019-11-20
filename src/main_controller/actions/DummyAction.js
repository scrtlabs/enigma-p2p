const Envelop = require("../channels/Envelop");

class DummyAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(communicator, envelop) {
    if (envelop.id()) {
      console.log(
        "Action: got " +
          envelop.type() +
          " " +
          JSON.stringify(envelop.content())
      );
      console.log("Action: sending back envelop");
      const type = "dummy";
      // if we need another runtime communicator
      // let dbCommunicator = this._controller.getCommunicator("db");
      // now send messages to db for example
      //
      const resEnv = new Envelop(
        envelop.id(),
        { response: "some response data" },
        type
      );
      communicator.send(resEnv);
    }
  }
}

module.exports = DummyAction;
