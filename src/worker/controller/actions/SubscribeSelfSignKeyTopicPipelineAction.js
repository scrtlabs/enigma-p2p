/**
 * This is the most catchy name a class can ever have.
 * The end goal of this action-pipeline is to subscribe the topic of the self sign ethereum key
 * by listening to this topic the worker can get requests such as GetEncryptionKey for some task
 * This should happend as soon as the worker starts
 * */
const constants = require('../../../common/constants');
const msgs = constants.CORE_REQUESTS;
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
        this._controller.logger().error('[-] err in SubscribeSelfSignKeyTopicPipelineAction {' + err +'} ');
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
          const type = data.type;
          this._controller.logger().info("[WORK_TOPIC_PUBLISH] " + type);
          const request = data.request;
          let targetTopic = null;
          switch(type){
            case msgs.NewTaskEncryptionKey:
              targetTopic = data.targetTopic;
              this._executeNewTaskEncryptionKey(request,targetTopic);
              break;
            case msgs.DeploySecretContract:
            case msgs.ComputeTask:
              this._executeTask(data);
              break;
            case constants.NODE_NOTIFICATIONS.GET_TASK_STATUS:
              targetTopic = data.targetTopic;
              this._getTaskStatus(request,targetTopic);
              break;
          };
        },
        onSubscribed: ()=>{
          this._controller.logger().debug('subscribed to [' + regParams.result.signingKey + '] self signKey');
          if (params.onResponse) {
            if(err){
              return params.onResponse(err);
            }
            return params.onResponse(err,regParams.result.signingKey);
          }
        },
      });
    });
  }
  _executeTask(msg){
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.START_TASK_EXEC,msg);
  }
  _executeNewTaskEncryptionKey(request,targetTopic){
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.NEW_TASK_INPUT_ENC_KEY, {
      request,
      onResponse: (err, encKeyResult)=>{
        this._controller.logger().debug('published workerEncryptionKey=[' + encKeyResult.result.workerEncryptionKey + '] encryption key');
        this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
          topic: targetTopic,
          message: JSON.stringify({
            result : {
              workerEncryptionKey: encKeyResult.result.workerEncryptionKey,
              workerSig: encKeyResult.result.workerSig
            }
          }),
        });
      },
    });
  }
  _getTaskStatus(request,targetTopic){
    this._controller.taskManager().getTaskStatus(request.taskId,(taskStatus)=>{
      if(!taskStatus){
        this._controller.logger().error('error check task status rpc taskId= ' + request.taskId);
        return;
      }
      this._controller.logger().debug('publishing task ' + taskStatus +' status ' + request.taskId);
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB,{
        topic : targetTopic,
        message: JSON.stringify({
          result : taskStatus
        })
      });
    });
  }
}
module.exports = SubscribeSelfSignKeyTopicPipelineAction;

