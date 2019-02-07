/**
 * this action handles everything that is published to task results topic
 * i.e whenever some other worker publishes a result of computation or deployment
 * this action:
 * - verify correctness of task
 * - update local storage
 * */
const constants = require('../../../../common/constants');
class VerifyAndStoreResultAction{
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * params {
   * notification,
   * params : Buffer -> {the actuall object from publish that contains from,data,,...}
   * }
   * */
  async execute(params){
    let optionalCallback = params.callback;
    let message = params.params;
    let from = message.from; // b58 id
    let data = message.data;
    let msgObj = JSON.parse(data.toString());
    // let resultObj = JSON.parse(JSON.parse(data.toString()).result);
    let resultObj = JSON.parse(msgObj.result);
    let contractAddress = msgObj.contractAddress;
    let type = msgObj.type;
    let log = "[RECEIVED_RESULT] taskId {" + resultObj.taskId+"} \nstatus {"+ resultObj.status + "}";
    this._controller.logger().debug(log);
    // TODO:: lena,a here verify the task result correctness
    // let isVerified = await ethereum().verify(result)
    let isVerified = true;
    if(isVerified){
      let coreMsg = this._buildIpcMsg(resultObj,type,contractAddress);
      if(coreMsg){
        this._controller.execCmd(constants.NODE_NOTIFICATIONS.UPDATE_DB,{
          callback : (err,result)=>{
            if(optionalCallback){
              return optionalCallback(err,result);
            }
            this._controller.logger().debug(`[UPDATE_DB] : is_err = ${err} result = ${result}`);
          },
          data : coreMsg
        });
      }
    }
  }
  _buildIpcMsg(resultObject,type,contractAddr){
    // FailedTask
    if(resultObject.status === constants.TASK_STATUS.FAILED){
      //TODO:: what to do with a FailedTask ???
      this._controller.logger().debug(`[RECEIVED_FAILED_TASK] FAILED TASK RECEIVED id = ${resultObject.taskId}`);
      return null;
    }
    // DeployResult
    else if(type === constants.CORE_REQUESTS.DeploySecretContract){
      return {
        address : contractAddr,
        bytecode : resultObject.output,
        type : constants.CORE_REQUESTS.UpdateNewContract
      }
    }
    // ComputeResult
    else if(type === constants.CORE_REQUESTS.ComputeTask){
      return {
        type : constants.CORE_REQUESTS.UpdateDeltas,
        deltas : [{address : contractAddr, key : resultObject.delta.key, data : resultObject.delta.data}],
      }
    }
  }
}
module.exports = VerifyAndStoreResultAction;
