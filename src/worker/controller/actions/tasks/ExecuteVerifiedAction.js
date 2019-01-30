/**
 * this action is called once a task is verified and now needs to be executed.
 * it builds and passes a request to core through the ipc.
 * then, it responds with the result back to the task manager.
 * */
const ComputeTask = require('../../../tasks/ComputeTask');
const DeployTask = require('../../../tasks/DeployTask');
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
    this._controller.communicator()
    .sendAndReceive(requestEnv)
    .then(responseEnvelop=>{
      let response = responseEnvelop.content();
      console.log("got response3!~!@!$#%^&^#@%");
      console.log(JSON.stringify(response));
      console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
    });
  }
}
module.exports = ExecuteVerifiedAction;
