const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');

class GetStatusProxyAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(requestEnvelop) {
    let taskId = requestEnvelop.content().taskId;
    try{
      // dont pass this errors here !!!!
      let result = await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.GET_TASK_RESULT,{taskId:taskId});
      const responseEnvelop = new Envelop(requestEnvelop.id(), {result: result.getStatus() , output : result.getOutput()}, requestEnvelop.type());
      this._controller.communicator().send(responseEnvelop);
    }catch(e){
      this._controller.logger().error(e);
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.ROUTE_BLOCKING_RPC, requestEnvelop);
    }
  }
}
module.exports = GetStatusProxyAction;
