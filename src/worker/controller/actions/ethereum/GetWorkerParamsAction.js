class GetWorkerParamsAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResult = params.onResponse;
    let err = null;
    let workerParams = null;

    try {
      workerParams = await this._controller.ethereum().api().getSelfWorker();
    } catch (e) {
      this._controller.logger().error(`[GET_ETH_WORKER_PARAM] error =  ${e}`);
      err = e;
    }
    if (onResult) {
      onResult(err, workerParams);
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      if (!params) params = {};
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = GetWorkerParamsAction;
