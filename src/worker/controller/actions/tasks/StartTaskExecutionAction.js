/**
 * This action takes a raw message (usually jsonrpc or self compute)
 * - turns it into a Task object
 * - sends to TaskManager
 * */
const ComputeTask = require('../../../tasks/ComputeTask');
const DeployTask = require('../../../tasks/DeployTask');
const taskTypes = require('../../../../common/constants').CORE_REQUESTS;

class StartTaskExecutionAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const type = params.type;
    const request = params.request;
    const onResponse = params.onResponse;
    let task = null;
    // TODO:: lena: refer to the diagrams, fake gasLimit
    request.gasLimit = 100000;
    switch (type) {
      case taskTypes.DeploySecretContract:
        request.taskId = request.contractAddress;
        task = DeployTask.buildTask(request);
        break;
      case taskTypes.ComputeTask:
        task = ComputeTask.buildTask(request);
        break;
    }
    if (task) {
      this._controller.taskManager().addTaskUnverified(task);
    }
    if(onResponse){
      onResponse(null);
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = StartTaskExecutionAction;
