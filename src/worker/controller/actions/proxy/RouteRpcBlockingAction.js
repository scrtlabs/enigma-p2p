
const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');

class RouteRpcBlockingAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * expects a targetTopic and id in the envelop.content()
   * targetTopic : the result topic will be published to
   * workerSignKey : the target topic for the request
   * */
  execute(requestEnvelop){
    const request = requestEnvelop.content();
    const sequence = requestEnvelop.content().id;
    const targetTopic = requestEnvelop.content().targetTopic;
    const workerSignKey = requestEnvelop.content().workerSignKey;
    const reqType = requestEnvelop.content().type;
    if(!targetTopic || !sequence || !workerSignKey){
      let env = new Envelop(requestEnvelop.id(),{result:false, error :"err no sequence/targetTopic/signKey"},requestEnvelop.type());
      return this._controller.
          communicator().
          send(env);
    }
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_SUB,{
      topic : targetTopic,
      onPublish : (msg)=>{
        // once the result from the worker arrives
        const data = JSON.parse(msg.data);
        const responseEnvelop = new Envelop(requestEnvelop.id(),{result:data.result},requestEnvelop.type());
        this._controller.communicator().send(responseEnvelop);
      },
      onSubscribed: ()=>{
        console.log('[rpc] subscribed to target topic = ' + targetTopic);
        // publish the actual request
        this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
          topic: workerSignKey,
          message: JSON.stringify({
            type :reqType ,
            request: request,
            sequence: sequence,
            targetTopic: targetTopic,
          }),
        });
      }
    });
  }
}
module.exports = RouteRpcBlockingAction;
