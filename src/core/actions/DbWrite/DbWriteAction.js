const Envelop = require('../../../main_controller/channels/Envelop');
const nodeUtils = require('../../../common/utils');
const Msg = require('../../../common/constants').CORE_REQUESTS;

class DbWriteAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(params){
    // let sendMsg = params.sendMsg;
    // let envelop = params.envelop;
    // let client = this._coreRuntime.getIpcClient();
    // client.sendJsonAndReceive(sendMsg,(responseMsg)=>{
    //   const resEnv = new Envelop(envelop.id(),responseMsg, envelop.type());
    //   this._coreRuntime.getCommunicator()
    //   .send(resEnv);
    // });
  }
}
module.exports = DbWriteAction;
