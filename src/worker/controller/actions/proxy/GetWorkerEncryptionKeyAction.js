// /**
//  * This action is performed by the requested worker.
//  * i.e some user asks his node for some remote worker's keys.
//  * this local now triggers this action. (in other words this is a request action not a response)
//  * TODO:: unsubscribe from temp event once got the result. (not too important)
//  * */
// const constants = require('../../../../common/constants');
// const Envelop = require('../../../../main_controller/channels/Envelop');
//
// class GetWorkerEncryptionKeyAction {
//   constructor(controller) {
//     this._controller = controller;
//   }
//   execute(requestEnvelop) {
//     const workerSignKey = requestEnvelop.content().workerSignKey;
//     const sequence = requestEnvelop.content().id;
//     const selfId = this._controller.engNode().getSelfIdB58Str();
//     const targetTopic = selfId + workerSignKey + sequence;
//     const request = requestEnvelop.content();
//     // subscribe to self topic parse response
//     this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_SUB,
//         {
//           topic: targetTopic,
//           onPublish: (msg)=>{
//             const result = {};
//             const data = JSON.parse(msg.data);
//             console.log(JSON.stringify(data,null,2));
//             // result.senderKey = data.senderKey;
//             result.workerEncryptionKey = data.workerEncryptionKey;
//             result.workerSig = data.workerSig;
//             // result.msgId = data.msgId;
//             const responseEnvelop = new Envelop(requestEnvelop.id(), {
//               result: result,
//             }, requestEnvelop.type());
//             this._controller.communicator().send(responseEnvelop);
//           },
//           onSubscribed: ()=>{
//             console.log('[rpc] temp subscribe to ' + targetTopic);
//             // publish the actual request
//             this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
//               topic: workerSignKey,
//               message: JSON.stringify({
//                 request: request,
//                 sequence: sequence,
//                 targetTopic: targetTopic,
//               }),
//             });
//           },
//         });
//   }
// }
// module.exports = GetWorkerEncryptionKeyAction;
