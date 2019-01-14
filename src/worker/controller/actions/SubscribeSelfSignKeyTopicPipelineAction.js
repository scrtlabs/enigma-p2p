/**
 * This is the most catchy name a class can ever have.
 * The end goal of this action-pipeline is to subscribe the topic of the self sign ethereum key
 * by listening to this topic the worker can get requests such as GetEncryptionKey for some task
 * This should happend as soon as the worker starts
 * */
const constants = require('../../../common/constants');
const waterfall = require('async/waterfall');

class SubscribeSelfSignKeyTopicPipelineAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    waterfall([
      (cb)=>{
        // get registration params of the worker from core
        this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS,
            {
              onResponse: (err, regParams)=>{
                cb(err, regParams);
              },
            });
      },
    ], (err, regParams)=>{
      if (err) {
        this._controller.logger().error('[-] err in SubscribeSelfSignKeyTopicPipelineAction {%s}', err);
        if (params.onResponse) {
          return params.onResponse(err);
        }
      }
      // subscribe to topic
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_SUB, {
        topic: regParams.result.signingKey,
        // onPublish will be called everytime something is published to the topic param
        onPublish: (msg) =>{
          const data = JSON.parse(msg.data);
          const request = data.request;
          const targetTopic = data.targetTopic;
          this._controller.execCmd(constants.NODE_NOTIFICATIONS.NEW_TASK_INPUT_ENC_KEY, {
            request,
            onResponse: (err, encKeyResult)=>{
              this._controller.logger().debug('published workerEncryptionKey=[' + encKeyResult.result.workerEncryptionKey + '] encryption key');
              this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
                topic: targetTopic,
                message: JSON.stringify({
                  workerEncryptionKey: encKeyResult.result.workerEncryptionKey,
                  workerSig: encKeyResult.result.workerSig,
                }),
              });
            },
          });
        },
        onSubscribed: ()=>{
          this._controller.logger().debug('subscribed to [' + regParams.result.signingKey + '] self signKey');
          if (params.onResponse) {
            return params.onResponse(err);
          }
        },
      });
    });
  }
}
module.exports = SubscribeSelfSignKeyTopicPipelineAction;

