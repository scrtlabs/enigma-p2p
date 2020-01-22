/**
 * Find content providers to provide data
 * Takes list of hashes -> turns them into cid's
 * calls next(result)
 * */
class FindContentProviderAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const descriptorsList = params.descriptorsList;
    const next = params.next;
    const isEngCid = params.isEngCid;
    this._controller.receiver().findProvidersBatch(descriptorsList, isEngCid, findProviderResult => {
      // TODO:: add error param to the callback.
      next(null, findProviderResult);
    });
  }
  asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      if (!params) {
        params = {};
      }
      params.next = function(err, data) {
        if (err) reject(err);
        else resolve(data);
      };
      action.execute(params);
    });
  }
}
module.exports = FindContentProviderAction;
