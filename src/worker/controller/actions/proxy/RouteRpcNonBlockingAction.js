const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');
class RouteRpcNonBlockingAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(requestEnvelop){
    const targetTopic = requestEnvelop.content().request.workerAddress;
    const request = requestEnvelop.content().request;
    const type = requestEnvelop.content().type;
    // validate topic indicated
    if(!targetTopic || !request){
      let env = new Envelop(requestEnvelop.id(),{result:{ sent : false}},requestEnvelop.type());
      return this._controller.
          communicator().
          send(env);
    }
    // send the request
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB,{
      topic: targetTopic,
      message: JSON.stringify({
        type : type,
        request: request,
      }),
    });
    // return jsonrpc response ack
    const responseEnvelop = new Envelop(requestEnvelop.id(),{result:{ sent : true}},requestEnvelop.type());
    this._controller.communicator().send(responseEnvelop);
  }
}
module.exports = RouteRpcNonBlockingAction;
