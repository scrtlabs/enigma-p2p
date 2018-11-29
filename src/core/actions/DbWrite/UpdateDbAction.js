const Envelop = require('../../../main_controller/channels/Envelop');
const constants = require('../../../common/constants');
const nodeUtils = require('../../../common/utils');

class UpdateDbAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  static _buildRequest(msgObj){
    let request = {
      id : nodeUtils.randId(),
      type : null,
    };
    if(msgObj.type() === constants.P2P_MESSAGES.SYNC_STATE_RES){
      request.type = constants.CORE_REQUESTS.UpdateDeltas;
      request.deltas = msgObj.deltas();
    }else if(msgObj.type() === constants.P2P_MESSAGES.SYNC_STATE_RES){
      request.type = constants.CORE_REQUESTS.UpdateNewContract;
      request.address = msgObj.contractAddress();
      request.bytecode = msgObj.deployedBytecode();
    }
    if(request.type)
      return request;

    return null;
  }
  execute(envelop){
    /***/
    let request = UpdateDbAction._buildRequest(envelop.content().input);
    this._coreRuntime.execCmd(constants.CORE_REQUESTS.CORE_DB_ACTION,{
      envelop : envelop,
      sendMsg : request,
    });
    /***/
  }
}
module.exports = UpdateDbAction;
