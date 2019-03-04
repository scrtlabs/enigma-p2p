class DepositAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const amount = params.amount;
    const onResult = params.onResponse;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        let success = false;
        if (err) {
          this._controller.logger().error(`[DEPOSIT] error=  ${err}`);
        }
        else {
          const workerAddress = regParams.result.signingKey;
          const txParams = {from: workerAddress};
          try {
            const txReceipt = await this._controller.ethereum().api().deposit(workerAddress, amount, txParams);
            this._controller.logger().info(`[DEPOSIT] successful deposit, receipt = ${txReceipt}`);
            success = true;
          } catch (e) {
            this._controller.logger().error(`[DEPOSIT] error=  ${e}`);
            err = e;
          }
        }
        if (onResult) {
          onResult(err, success);
        }
      },
    });
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
