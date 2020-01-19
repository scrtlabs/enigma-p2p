const constants = require("../../../../common/constants");
const EngCid = require("../../../../common/EngCID");
/**
 * This Action announces to the network about it's local state
 * This should be called once the node is synched with the network and has all the deltas and contracts.
 * //TODO:: add flag to check if and only if NODE_IS_FULLY_SYNCED then allow otherwise dismiss the request
 * */
class AnnounceLocalStateAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResponse = params.onResponse;
    let isEngCid = params.isEngCid;

    this._controller.execCmd(constants.NODE_NOTIFICATIONS.GET_ALL_ADDRS, {
      onResponse: (err, allAddrsResponse) => {
        /**
         * do the announcement
         * */
        let parsedEngCids = [];
        for (const address of allAddrsResponse.result.addresses) {
          const ecid = EngCid.createFromSCAddress(address);
          if (ecid) {
            parsedEngCids.push(ecid);
          } else {
            this._controller.logger().error(`error converting address ${address} to ecid !`);
          }
        }
        isEngCid = true;
        this._controller.provider().provideContentsBatch(parsedEngCids, isEngCid, (err, failedCids) => {
          if (err) {
            // TODO:: this is completley incorrect.
            // TODO:: it shows like there was some total error, but there will be errrors in the case where 1 peer logged out
            // TODO:: it will try to reconnect to him in the DHT and will throw an error
            // TODO:: this is ok accestable behaviour.
            // TODO:: the log below is missleading it says that there was a general error but that's no true, everything still works/
            // TODO:: Bottom line im not processing the errors in the correct way.
            return onResponse(err, parsedEngCids);
          } else {
            this._controller.logger().debug("[+] success providing cids.");
            return onResponse(null, parsedEngCids);
          }
        });
      }
    });
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.callback = function(status, result) {
        resolve({ status: status, result: result });
      };
      action.execute(params);
    });
  }
}
module.exports = AnnounceLocalStateAction;
