/**
 @TODO lena commit receipt back to ethereum contract
 * */
const cryptography = require('../../../../common/cryptography');
const FailedResult = require('../../../tasks/Result').FailedResult;
class CommitReceiptAction{
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params){
    let task = params.task;
    let callback = params.callback;
    if(!task) return;

    if(task instanceof FailedResult){
      /**
       * Worker commits the failed task result on-chain
       * @param {string} secretContractAddress - V
       * @param {string} taskId - V
       * @param {Integer} gasUsed - V
       * @param {string} ethCall - ????????????? //TODO BUG SHOULD BE REMOVED  https://github.com/enigmampc/enigma-contract-internal/issues/36
       * @param {string} signature
       * @param {JSON} txParams
       * @return {Promise} receipt
       * */
      try{
        let txReceipt = await
        this._controller
        .ethereum()
        .commitTaskFailure(
            task.getContractAddr(),
            task.getTaskId(),
            task.getResult().getUsedGas(),
            task.getResult().getSignature(),
        );
        this._controller.logger().info(`COMMIT_RECEIPT_FAILED task ${task.getTaskId()} success.`);
      }catch(e){
        this._controller.logger().error(`[ERROR_COMMIT_RECEIPT] taskId ${tasl.getTaskId()} tx failed ${e}`);
      }
    }else{
      /**
       * Worker commits the results on-chain
       * @param {string} secretContractAddress - V
       * @param {string} taskId - V
       * @param {string} stateDeltaHash - X
       * @param {string} outputHash - X
       * @param {Integer} gasUsed - V
       * @param {string} ethCall - V
       * @param {string} signature - V
       * @param {JSON} txParams - default
       * @return {Promise} receipt
       * */
      if(!task.getResult().getDelta().data || !task.getResult().getOutput()){
        this._controller.logger().error(`[ERROR_COMMIT_RECEIPT] taskId ${tasl.getTaskId()} no deta/output`);
        return;
      }
      try{
        let txReceipt = await this._controller
        .ethereum()
        .commitReceipt(
            task.getContractAddr(),
            task.getTaskId(),
            cryptography.hash(task.getResult().getDelta().data),
            cryptography.hash(task.getResult().getOutput()),
            task.getResult().getUsedGas(),
            task.getResult().getEthPayload(),
            task.getResult().getSignature()
        );
        this._controller.logger().info(`COMMIT_RECEIPT task ${task.getTaskId()} success.`);
      }catch(e){
        this._controller.logger().error(`[ERROR_COMMIT_RECEIPT] taskId ${tasl.getTaskId()} tx failed ${e}`);
      }
    }
  }
}
module.exports = CommitReceiptAction;
