const Envelop = require('../../main_controller/channels/Envelop');
const nodeUtils = require('../../common/utils');
const Msg = require('../../common/constants').CORE_REQUESTS;

class GetAllTipsAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(envelop){
    let client = this._coreRuntime.getIpcClient();
    client.sendJsonAndReceive({
      id : nodeUtils.randId(),
      type : Msg.GetAllTips
    },(responseMsg)=>{
      const resEnv = new Envelop(envelop.id(),responseMsg, envelop.type());
      this._coreRuntime.getCommunicator()
        .send(resEnv);
    });
  }
}
module.exports = GetAllTipsAction;
