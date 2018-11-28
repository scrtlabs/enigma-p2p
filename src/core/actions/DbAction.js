const Envelop = require('../../main_controller/channels/Envelop');

class DbAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(params){
    let sendMsg = params.sendMsg;
    let envelop = params.envelop;
    let client = this._coreRuntime.getIpcClient();
    client.sendJsonAndReceive(sendMsg,(responseMsg)=>{
      const resEnv = new Envelop(envelop.id(),responseMsg, envelop.type());
      this._coreRuntime.getCommunicator()
      .send(resEnv);
    });
  }
}
module.exports = DbAction;
