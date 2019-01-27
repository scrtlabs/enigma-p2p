/**
 * performed by the gateway side.
 * this action dispatches
 * */
const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');

class ProxyReqDispatcherAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(requestEnvelop) {
    const type = requestEnvelop.content().type;
    let theAction = null;
    switch(type){
      case constants.CORE_REQUESTS.NewTaskEncryptionKey:
        theAction = constants.NODE_NOTIFICATIONS.GW_GET_ENC_KEY;
        break;
    }
    if(theAction){
      this._controller.execCmd(theAction,requestEnvelop);
    }
  }
}
module.exports = ProxyReqDispatcherAction;
