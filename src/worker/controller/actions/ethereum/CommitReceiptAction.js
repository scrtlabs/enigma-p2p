/**
 @TODO lena commit receipt back to ethereum contract
 * */

const FailedResult = require('../../../tasks/Result').FailedResult;
class CommitReceiptAction{
  constructor(controller) {
    this._controller = controller;
  }
  execute(params){
    let task = params.task;
    let callback = params.callback;
    if(!task) return;

    if(task instanceof FailedResult){

    }else{
      //TODO:: hashing is done here verify correctness.
      /**
       * Worker commits the results on-chain
       * @param {string} secretContractAddress
       * @param {string} taskId
       * @param {string} stateDeltaHash
       * @param {string} outputHash
       * @param {Integer} gasUsed
       * @param {string} ethCall
       * @param {string} signature
       * @param {JSON} txParams
       * @return {Promise} receipt
       * */
      // this._controller.ethereum().commitReceipt(task.getContractAddr(),task.getTaskId());
    }
  }
}
module.exports = CommitReceiptAction;
