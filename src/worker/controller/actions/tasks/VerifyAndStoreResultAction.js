/**
 * this action handles everything that is published to task results topic
 * i.e whenever some other worker publishes a result of computation or deployment
 * this action:
 * - verify correctness of task
 * - update local storage
 * */
const constants = require('../../../../common/constants');
const EngCid = require('../../../../common/EngCID');
const OutsideTask = require('../../../tasks/OutsideTask');
class VerifyAndStoreResultAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * params {
   * notification,
   * params : Buffer -> {the actuall object from publish that contains from,data,,...}
   * }
   * */
  async execute(params) {
    const optionalCallback = params.callback;
    const message = params.params;
    const from = message.from; // b58 id
    const data = message.data;
    const msgObj = JSON.parse(data.toString());
    const resultObj = JSON.parse(msgObj.result);
    const contractAddress = msgObj.contractAddress;
    const type = msgObj.type;
    const log = '[RECEIVED_RESULT] taskId {' + resultObj.taskId+'} \nstatus {'+ resultObj.status + '}';
    this._controller.logger().debug(log);
    // TODO:: lena,a here verify the task result correctness
    // let isVerified = await ethereum().verify(result)
    const isVerified = true;
    if (isVerified) {
      const coreMsg = this._buildIpcMsg(resultObj, type, contractAddress);
      if (coreMsg) {
        this._controller.execCmd(constants.NODE_NOTIFICATIONS.UPDATE_DB, {
          callback: async (err, result)=>{
            // announce as provider if its deployment and successfull
            if(type === constants.CORE_REQUESTS.DeploySecretContract && resultObj.status === constants.TASK_STATUS.SUCCESS){
              let ecid = EngCid.createFromSCAddress(resultObj.taskId);
              if(ecid){
                try{
                  // announce the network
                  await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.ANNOUNCE_ENG_CIDS,{engCids : [ecid]});
                  // store result in TaskManager mapped with taskId
                  let outsideTask = OutsideTask.buildTask(type,resultObj);
                  if(outsideTask){
                    await this._controller.taskManager().addOutsideResult(type,outsideTask);
                  }
                }catch(e){
                  this._controller.logger().error(`[PUBLISH_ANNOUNCE_TASK] cant publish ecid or store in TaskManager -> ${e}`);
                }
              }
            }
            if (optionalCallback) {
              return optionalCallback(err, result);
            }
            this._controller.logger().debug(`[UPDATE_DB] : is_err ?  ${err}`);
          },
          data: coreMsg,
        });
      }
    }
  }
  _buildIpcMsg(resultObject, type, contractAddr) {
    // FailedTask
    if (resultObject.status === constants.TASK_STATUS.FAILED) {
      // TODO:: what to do with a FailedTask ???
      this._controller.logger().debug(`[RECEIVED_FAILED_TASK] FAILED TASK RECEIVED id = ${resultObject.taskId}`);
      return null;
    }
    // DeployResult
    else if (type === constants.CORE_REQUESTS.DeploySecretContract) {
      return {
        address: contractAddr,
        bytecode: resultObject.output,
        type: constants.CORE_REQUESTS.UpdateNewContract,
      };
    }
    // ComputeResult
    else if (type === constants.CORE_REQUESTS.ComputeTask) {
      return {
        type: constants.CORE_REQUESTS.UpdateDeltas,
        deltas: [{address: contractAddr, key: resultObject.delta.key, data: resultObject.delta.data}],
      };
    }
  }
}
module.exports = VerifyAndStoreResultAction;
