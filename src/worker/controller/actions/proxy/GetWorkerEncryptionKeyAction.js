/**
 * This action is performed by the requested worker.
 * i.e some user asks his node for some remote worker's keys.
 * this local now triggers this action. (in other words this is a request action not a response)
 * TODO:: unsubscribe from temp event once got the result. (not too important)
 * */
const constants = require('../../../../common/constants');
const Envelop = require('../../../../main_controller/channels/Envelop');

class GetWorkerEncryptionKeyAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(requestEnvelop){
    let workerSignKey = requestEnvelop.content().workerSignKey;
    let sequence = requestEnvelop.content().sequence;
    let selfId = this._controller.engNode().getSelfIdB58Str();
    let targetTopic = selfId + workerSignKey + sequence;
    let request = requestEnvelop.content().request;
    // subscribe to self topic parse response
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_SUB,
        {
          topic : targetTopic,
          onPublish : (msg)=>{
            let result = {};
            let data = JSON.parse(msg.data);
            result.workerEncryptionKey = data.workerEncryptionKey;
            result.workerSig = data.workerSig;
            result.msgId = data.msgId;
            let responseEnvelop = new Envelop(requestEnvelop.id(),{
              result : result,
            }, requestEnvelop.type());
            this._controller.communicator().send(responseEnvelop);
          },
          onSubscribed : ()=>{
            console.log('[rpc] temp subscribe to ' + targetTopic);
            // publish the actual request
            this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB,{
              topic : workerSignKey,
              message : JSON.stringify({
                request : request,
                sequence : sequence,
                targetTopic : targetTopic,
              }),
            });
          }
    });
  }
}
module.exports = GetWorkerEncryptionKeyAction;
