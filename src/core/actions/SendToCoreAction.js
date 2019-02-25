const Envelop = require('../../main_controller/channels/Envelop');

class SendToCoreAction {
  constructor(coreRuntime) {
    this._coreRuntime = coreRuntime;
  }
  execute(params) {
    const sendMsg = params.sendMsg;
    const envelop = params.envelop;
    const client = this._coreRuntime.getIpcClient();
    if(!sendMsg.id){
      sendMsg.id = envelop.id();
    }
    client.sendJsonAndReceive(sendMsg, (err, responseMsg) => {
      if (err) {
        console.error(`[Error] Failed in Send JSON And Receive: ${err}`);
        return;
      }
      const resEnv = new Envelop(envelop.id(), responseMsg, envelop.type());
      this._coreRuntime.getCommunicator()
          .send(resEnv);
    }).catch(console.error);
  }
}
module.exports = SendToCoreAction;
