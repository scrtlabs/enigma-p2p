/**
 * this action is called everytime someone publishes to self.registerKey (ethereum sign key) topic.
 * */
const constants = require('../../../common/constants');

class SubscriptionsDispatcherAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * dispatch the request by calling the correct action and doing pre-process to the inputs.
   * */
  execute(params){

  }
}
module.exports = SubscriptionsDispatcherAction;

