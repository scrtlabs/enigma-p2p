const errors = require("../../../../common/errors");
const EngCid = require("../../../../common/EngCID");
class AnnounceContentAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResponse = params.onResponse;
    let engCids = params.engCids;
    if (!engCids || !engCids.length) {
      const msg = `[AnnounceContent] ${engCids} is not list of EngCid's`;
      if (onResponse) {
        return onResponse(new errors.TypeErr(msg));
      }
      return this._controller.logger().error(msg);
    }
    // extra safety, extra O(n)
    engCids = engCids.filter(ecid => {
      return ecid instanceof EngCid;
    });
    try {
      let failedCids = await this._controller
        .provider()
        .asyncProvideContentsBatch(engCids);
      this._controller
        .logger()
        .debug(
          `[+] success announcing content, failedCids # =  ${failedCids.length}`
        );
      return onResponse(null, failedCids);
    } catch (e) {
      if (onResponse) {
        return onResponse(e);
      }
      this._controller
        .logger()
        .error(`[AnnounceContent] can't announce message: ${e}`);
    }
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej) => {
      params.onResponse = function(err, failedCids) {
        if (err) rej(err);
        else res(failedCids);
      };
      action.execute(params);
    });
  }
}
module.exports = AnnounceContentAction;
