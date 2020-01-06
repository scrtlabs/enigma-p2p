const StateSync = require("../../../../ethereum/StateSync");
const constants = require("../../../../common/constants");
const errs = require("../../../../common/errors");
const NODE_NOTIY = constants.NODE_NOTIFICATIONS;

/**
 * This action is the first step to sync
 * this identifies the missing state the worker needs.
 * - it will use the cache or go directly to core.
 * - get the local tips
 * - get remote tips
 * - parse them into a format class "MissingStatesMap"
 * - and return the result to the caller.
 * @return {JSON} res:
 *       missingList - missing states [{address, deltas : [deltaHash, index]}].
 *                     In case the entire contract is missing, the bytecodeHash is returned as well:
 *                     [{address, bytecodeHash , deltas : [deltaHash, index]}]
 *       excessList - excessive states [{address, remoteTip].
 *                    In case the entire contract is excessive, the remoteTip field is set to -1
 * */
class IdentifyMissingStatesAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const useCache = params.cache;
    const callback = params.onResponse;
    if (useCache) {
      this._controller.cache().getAllTips((err, tipsList) => {
        // TODO:: implement cache logic
        // TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    } else {
      try {
        // LOCAL TIPS : {type,id,tips: [{address,key,delta},...]}
        const localTips = await this._controller.asyncExecCmd(NODE_NOTIY.GET_ALL_TIPS, { cache: useCache });
        if (!this._controller.hasEthereum()) {
          const error = new errs.EthereumErr(`[IDENTIFY_MISSING_STATES] failure, no ethereum!`);
          return callback(error);
        }
        StateSync.compareLocalStateToRemote(this._controller.ethereum().api(), localTips)
          .then(res => {
            callback(null, res);
          })
          .catch(err => callback(err));
      } catch (err) {
        return callback(err);
      }
    }
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      if (!params) {
        params = {};
      }
      params.onResponse = function(err, data) {
        if (err) reject(err);
        else resolve(data);
      };
      action.execute(params);
    });
  }
}
module.exports = IdentifyMissingStatesAction;
