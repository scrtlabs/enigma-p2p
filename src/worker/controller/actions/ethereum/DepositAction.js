const constants = require('../../../../common/constants');

class DepositAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const amount = params.amount;
    const onResult = params.onResponse;
    let success = false;
    let err = null;

    try {
      const txReceipt = await this._controller.ethereum().api().selfDeposit(amount);
      this._controller.logger().info(`[DEPOSIT] successful deposit, receipt = ${txReceipt}`);
      success = true;
    } catch (e) {
      this._controller.logger().error(`[DEPOSIT] error=  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, success);
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
module.exports = DepositAction;
