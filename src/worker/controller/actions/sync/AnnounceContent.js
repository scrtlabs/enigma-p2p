const errors = require('../../../../common/errors');
class AnnounceContent {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResponse = params.onResponse;
    const isEngCid = params.isEngCid;
    let engCids = params.engCids;
    if (!engCids || !engCids.length) {
      const msg = `[AnnounceContent] ${engCids} is not list of EngCid's`;
      if (onResponse) {
        return onResponse(new errors.TypeErr(msg));
      }
      return this._controller.logger().error(msg);
    }
    // extra safety, extra O(n)
    engCids = engCids.filter((ecid)=>{
      return (ecid !== undefined && ecid !== null);
    });
    this._controller.provider().provideContentsBatch(engCids, isEngCid, (err, failedCids)=>{
      if (err) {
        if (onResponse) {
          return onResponse({error: err, failedCids: failedCids});
        }
        return this._controller.logger().error(`[AnnounceContent] can't provide ${failedCids} message: ${err}`);
      }
      this._controller.logger().debug('[+] success providing cids');
      return onResponse(null);
    });
  }
}
module.exports = AnnounceContent;


