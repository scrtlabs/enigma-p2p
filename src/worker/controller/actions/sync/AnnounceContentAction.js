const errors = require("../../../../common/errors");

class AnnounceContentAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const onResponse = params.onResponse;
    let engCids = params.engCids;
    if (!engCids || !engCids.length) {
      const msg = `[AnnounceContent] ${engCids} is not list of EngCid's`;
      this._controller.logger().error(msg);
      return onResponse(new errors.TypeErr(msg));
    }
    try {
      let failedCids = await this._controller.provider().asyncProvideContentsBatch(engCids);
      if (Array.isArray(failedCids) && failedCids.length) {
        if (failedCids.length === engCids.length) {
          const error = `[AnnounceContent] content announce failed`;
          this._controller.logger().error(error);
          return onResponse(error);
        }
        this._controller
          .logger()
          .debug(`[AnnounceContent] announced = ${engCids.length - failedCids.length} out of ${engCids.length}`);
      } else {
        this._controller.logger().debug(`[AnnounceContent] success announcing content`);
      }
      return onResponse(null, failedCids);
    } catch (e) {
      this._controller.logger().error(`[AnnounceContent] can't announce: ${e}`);
      return onResponse(e);
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
