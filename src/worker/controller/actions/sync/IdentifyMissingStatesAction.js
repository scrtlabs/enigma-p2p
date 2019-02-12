const LocalMissingStateResult = require('../../../state_sync/receiver/LocalMissingStatesResult');
const StateSync = require('../../../../ethereum/StateSync');
const constants = require('../../../../common/constants');
const errs = require('../../../../common/errors');
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
 * { missingStatesMap - a map of the missing states, indexed by the address - address : {deltas: {index: deltaHash}, bytecodeHash},
 *   missingStatesMsgsMap -  a map of the messages requesting the missing states, indexed by the address - address : [Array<SyncResMsg>]
 * }
 * */
class IdentifyMissingStatesAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    let useCache = params.cache;
    let finalCallback = params.onResponse;
    if (useCache) {
      this._controller.cache().getAllTips((err, tipsList) => {
        //TODO:: implement cache logic
        //TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    } else {
      this._controller.execCmd(NODE_NOTIY.GET_ALL_TIPS, {
        cache: useCache,
        onResponse: (err, localTips) => {
          // LOCAL TIPS : {type,id,tips: [{address,key,delta},...]}
          if (err || !this._controller.hasEthereum()) {
            let error = err;
            if(!this._controller.hasEthereum()){
              error =  new errs.EthereumErr(`[IDENTIFY_MISSING_STATES] failure, no ethereum!`);
            }
            return finalCallback(error);
          }
          return IdentifyMissingStatesAction.
              _buildMissingStatesResult(this._controller.ethereum(), localTips, (err, res)=> {
            if (err) {
              return finalCallback(err);
            }
            return finalCallback(null, res);
          });
        },
      });
    }
  }

  static _buildMissingStatesResult(enigmaContractApi, localTips, cb) {
    StateSync.getRemoteMissingStates(enigmaContractApi, localTips, (err, missingList) => {
      let res = {missingStatesMap: {}, missingStatesMsgsMap: {}};

      if (err) {
        return cb(err);
      }

      let result = LocalMissingStateResult.createP2PReqMsgsMap(missingList);
      let finalOutput = {};
      for (let addrKey in result) {
        let obj = result[addrKey];
        if (obj.bcodeReq) {
          obj.deltasReq.push(obj.bcodeReq);
        }
        finalOutput[addrKey] = obj.deltasReq;
      }
      res.missingStatesMap = IdentifyMissingStatesAction._transformMissingStatesListToMap(missingList);
      res.missingStatesMsgsMap = finalOutput;
      return cb(null, res);
    });
  }
  static _transformMissingStatesListToMap(missingStatesList) {
    let missingStatesMap = {};
    for (let i=0; i<missingStatesList.length; ++i) {
      let deltasMap = {};
      for (let j=0; j<missingStatesList[i].deltas.length; j++) {
        const index = missingStatesList[i].deltas[j].index;
        const deltaHash = missingStatesList[i].deltas[j].deltaHash;
        deltasMap[index] = deltaHash;
      }
      if ('bytecodeHash' in missingStatesList[i]) {
        missingStatesMap[missingStatesList[i].address] = {deltas: deltasMap, bytecodeHash: missingStatesList[i].bytecodeHash};
      }
      else {
        missingStatesMap[missingStatesList[i].address] = {deltas: deltasMap};
      }
    }
    return missingStatesMap;
  }
}
module.exports = IdentifyMissingStatesAction;

