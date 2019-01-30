const Envelop = require('../../../../main_controller/channels/Envelop');
const nodeUtils = require('../../../../common/utils');
const Msg = require('../../../../common/constants').CORE_REQUESTS;

class GetAllAddrsAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(envelop){
    /***/
    let request = {
      id : nodeUtils.randId(),
      type : Msg.GetAllAddrs
    };
    this._coreRuntime.execCmd(Msg.CORE_DB_ACTION,{
      envelop : envelop,
      sendMsg : request,
    });
    /***/
  }
}
module.exports = GetAllAddrsAction;
