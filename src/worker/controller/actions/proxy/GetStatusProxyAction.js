const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');
/**
 * This action takes a taskId and checks if the result + status exists locally.
 * if true: returns back the envelop
 * else:
 * ROUTE_BLOCKING_RPC (i.e goes to the network and looks for the worker)
 * */
class GetStatusProxyAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(requestEnvelop) {
    let taskId = requestEnvelop.content().taskId;
    try{
      let result = await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.GET_TASK_RESULT,{taskId:taskId});
      const responseEnvelop = new Envelop(requestEnvelop.id(), {result: result.getStatus() , output : result.getOutput()}, requestEnvelop.type());
      this._controller.communicator().send(responseEnvelop);
    }catch(e){
      console.log("-------------------------------------");
      this._controller.logger().error(e);
      console.log("-------------------------------------");
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.ROUTE_BLOCKING_RPC, requestEnvelop);
    }
  }
}
module.exports = GetStatusProxyAction;
