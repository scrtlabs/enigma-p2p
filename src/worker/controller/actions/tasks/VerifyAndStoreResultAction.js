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
    let message = params.params;
    let from = message.from; // b58 id
    let data = message.data;
    let resultObj = JSON.parse(JSON.parse(data.toString()).result);
    let log = "[RECEIVED_RESULT] taskId {" + resultObj.taskId+"} \nstatus {"+ resultObj.status + "}";
    this._controller.logger().debug(log);
    // TODO:: lena,a here verify the task result correctness
    // let isVerified = await ethereum().verify(result)
    let isVerified = true;
    if(isVerified){
      // this._controller.execCmd(constants.CORE_REQUESTS.UpdateDeltas)
    }
  }
}
module.exports = VerifyAndStoreResultAction;
