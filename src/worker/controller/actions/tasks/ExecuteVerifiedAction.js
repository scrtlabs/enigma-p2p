/**
 * this action is called once a task is verified and now needs to be executed.
 * it builds and passes a request to core through the ipc.
 * then, it responds with the result back to the task manager.
 * */
const Result = require('../../../tasks/Result');
const taskTypes = require('../../../../common/constants').CORE_REQUESTS;
const Envelop = require('../../../../main_controller/channels/Envelop');
const constants = require('../../../../common/constants');

class ExecuteVerifiedAction{
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params){
    let task = params.task;
    let requestEnv = new Envelop(true,{
      type : constants.CORE_REQUESTS.DeploySecretContract,
      task : task.toDbJson(),
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
    switch(response.type){
      case constants.CORE_REQUESTS.FailedTask:
        result = Result.FailedResult.buildFailedResult(response);
        break;
      case constants.CORE_REQUESTS.DeploySecretContract:
        result = Result.DeployResult.buildDeployResult(response);
        break;
      case constants.CORE_REQUESTS.ComputeTask:
        result = Result.ComputeResult.buildComputeResult(response);
        break;
    }
    // update task manager with the result
    if(result){
      try{
        await this._controller.taskManager().asyncOnFinishTask(result);
      }catch(e){
        this._controller.logger().error(e);
      }
    }
  }
}
module.exports = ExecuteVerifiedAction;
