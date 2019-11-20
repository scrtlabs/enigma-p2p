/**
 * This can fail.
 * Given an input:
 * - Missing deltas
 * - CID's and ProviderList for EACH CID (FindProviderResult.js)
 * Fetch from the providers all the bytecode/deltas
 * */
const waterfall = require("async/waterfall");
const errors = require("../../../../common/errors");
class TryReceiveAllAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * @param {JSON} params : {
   *  - findProvidersResult
   *  - missingStates
   *  - onFinish
   * }
   * */
  execute(params) {
    const allMissingDataList = params.allMissingDataList;
    const remoteMissingStatesMap = params.remoteMissingStatesMap;
    const onFinish = params.onFinish;
    const receiver = this._controller.receiver();

    if (allMissingDataList.length === 0) {
      return onFinish(
        new errors.SyncReceiverNoMissingDataErr("No missing data")
      );
    }

    const jobs = [];
    const firstJob = allMissingDataList[0];
    // pass the missingStateList to the receiver
    receiver.setRemoteMissingStatesMap(remoteMissingStatesMap);
    // init the first job
    jobs.push(cb => {
      receiver.trySyncReceive(
        firstJob.providers,
        firstJob.requestMessages,
        (err, isDone, resultList) => {
          if (err) {
            return cb(err);
          } else {
            const allResults = [];
            allResults.push({
              success: isDone,
              resultList: resultList,
              error: err
            });
            return cb(null, allResults);
          }
        }
      );
    });
    // init the rest of the jobs
    for (let i = 1; i < allMissingDataList.length; ++i) {
      const providers = allMissingDataList[i].providers;
      const requestMessages = allMissingDataList[i].requestMessages;
      jobs.push((allResults, cb) => {
        receiver.trySyncReceive(
          providers,
          requestMessages,
          (err, isDone, resultList) => {
            if (err) {
              return cb(err);
            } else {
              allResults.push({
                success: isDone,
                resultList: resultList,
                error: err
              });
              return cb(null, allResults);
            }
          }
        );
      });
    }
    // execute all the jobs
    waterfall(jobs, (err, allResults) => {
      onFinish(err, allResults);
    });
  }
}
module.exports = TryReceiveAllAction;
