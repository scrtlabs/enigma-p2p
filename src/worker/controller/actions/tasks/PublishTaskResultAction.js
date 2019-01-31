/**
 * Once the TaskManager emits FINISH_TASK
 * this action:
 * - publish the result to the results topic
 * - publish the result back to etherum
 * */
const constants = require('../../../../common/constants');


class PublishTaskResultAction{
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params){
    let task = params.task;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB,{
      topic : constants.PUBSUB_TOPICS.TASK_RESULTS,
      message : JSON.stringify({
      result: task.getResult().toDbJson()
      })
    });
    //TODO:: commit the result back to ethereum
  }
}
module.exports = PublishTaskResultAction;
