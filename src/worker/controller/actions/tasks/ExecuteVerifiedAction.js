/**
 * this action is called once a task is verified and now needs to be executed.
 * it builds and passes a request to core through the ipc.
 * then, it responds with the result back to the task manager.
 * */
const Result = require('../../../tasks/Result');
const constants = require('../../../../common/constants');
const taskTypes = constants.CORE_REQUESTS;
const Envelop = require('../../../../main_controller/channels/Envelop');


class ExecuteVerifiedAction{
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params){
    let task = params.task;
    let requestEnv = new Envelop(true,{
      type : task.getTaskType(),
      input : task.toDbObject(),
    },constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest);
    let responseEnvelop = null;
    try{
      responseEnvelop  = await this._controller.communicator().sendAndReceive(requestEnv);
    }catch(e){
      return this._controller.logger().error(e);
    }
    let response = responseEnvelop.content();
    // check for system error
    if(response.msg){
      //TODO:: what happens to the stored task? its still IN-PROGRESS state in the task manager.
      return this._controller.logger().error("response from Core" + response);
    }
    let result = null;
    if(response.result){
      response.result.taskId = task.getTaskId();
    }
    switch(response.type){
      case taskTypes.FailedTask:
        response.result.status = constants.TASK_STATUS.FAILED;
        result = Result.FailedResult.buildFailedResult(response.result);
        break;
      case taskTypes.DeploySecretContract:
        response.result.status = constants.TASK_STATUS.SUCCESS;
        result = Result.DeployResult.buildDeployResult(response.result);
        break;
      case taskTypes.ComputeTask:
        response.result.status = constants.TASK_STATUS.SUCCESS;
        result = Result.ComputeResult.buildComputeResult(response.result);
        break;
    }
    // update task manager with the result
    if(result){
      try{
        await this._controller.taskManager().asyncOnFinishTask(result);
      }catch(e){
        this._controller.logger().error(e);
      }
    }else{
      this._controller.logger().error("failed building Result from Task");
    }
  }
}
module.exports = ExecuteVerifiedAction;
