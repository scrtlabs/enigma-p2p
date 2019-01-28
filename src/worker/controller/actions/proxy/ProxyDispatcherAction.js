/**
 * performed by the gateway side.
 * this action dispatches
 * */
const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');

class ProxyDispatcherAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(requestEnvelop){
    const type = requestEnvelop.content().type;
    let theAction = null;
    switch(type){
      case constants.CORE_REQUESTS.NewTaskEncryptionKey:
        theAction = constants.NODE_NOTIFICATIONS.ROUTE_BLOCKING_RPC;
        const workerSignKey = requestEnvelop.content().workerSignKey;
        const sequence = requestEnvelop.content().id;
        const selfId = this._controller.engNode().getSelfIdB58Str();
        requestEnvelop.content().targetTopic = selfId + workerSignKey + sequence;
        break;
      case constants.CORE_REQUESTS.DeploySecretContract:
        theAction =constants.NODE_NOTIFICATIONS.ROUTE_NON_BLOCK_RPC;
        break;
    }
    this._controller.execCmd(theAction,requestEnvelop);
  }
}
module.exports = ProxyDispatcherAction;
