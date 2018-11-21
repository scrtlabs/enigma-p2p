const constants = require('../../../../common/constants');
const NODE_NOTIFY = constants.NODE_NOTIFICATIONS;
const waterfall = require('async/waterfall');
const EngCid = require('../../../../common/EngCID');
/**
 * RECEIVER SIDE
 * Q: What does it do?
 * A: sync all the contracts/deltas from identifying what's missing to saving it back to db
 *
 * This runs several actions which is why it is a pipeline.
 *
 * */
class ReceiveAllPipelineAction {
  constructor(controller) {
    this._controller = controller;
    this._running = false;
  }

  execute(params) {
    let cache = params.cache;
    let onEnd = params.onEnd;

    if(this._running){
      return onEnd('already running');
    }
    this._running = true;

    waterfall([
      cb => {
        this._controller.execCmd(
            NODE_NOTIFY.IDENTIFY_MISSING_STATES_FROM_REMOTE, {
              cache: cache,
              onResponse: (err, missingStatesMsgsMap) => {
                cb(err, missingStatesMsgsMap);
              }
            });
      },
      (missingStatesMap, cb) => {
        let err = null;
        let ecids = [];
        let tempEcidToAddrMap = {};
        for (let addrKey in missingStatesMap) {
          let ecid = EngCid.createFromKeccack256(addrKey);
          if (ecid) {
            //TODO:: every EngCid should expose the addr as a built
            //TODO:: in method
            tempEcidToAddrMap[ecid.getKeccack256()] = addrKey;
            ecids.push(ecid);
          } else {
            err = "error creating EngCid from " + addrKey;
          }
        }
        return cb(err, ecids,missingStatesMap,tempEcidToAddrMap);
      },
      (ecidList,missingStatesMap, tempEcidToAddrMap,cb) => {
        this._controller.execCmd(NODE_NOTIFY.FIND_CONTENT_PROVIDER, {
          descriptorsList: ecidList,
          isEngCid: true,
          next: (findProviderResult) => {
            return cb(null, findProviderResult, ecidList,missingStatesMap,tempEcidToAddrMap);
          }
        });
      },
      (findProviderResult, ecids, missingStatesMap,tempEcidToAddrMap,cb) => {
        if(findProviderResult.isCompleteError() || findProviderResult.isErrors()){
          cb("[-] some error finding providers !");
        }
        // parse to 1 object: cid => {providers, msgs} -> simple :)
        let allReceiveData = [];
        ecids.forEach(ecid => {
          allReceiveData.push({
            requestMessages: missingStatesMap[tempEcidToAddrMap[ecid.getKeccack256()]],
            providers: findProviderResult.getProvidersFor(ecid)
          });
        });
        return cb(null, allReceiveData);
      },
      (allReceiveData, cb) => {
        this._controller.execCmd(NODE_NOTIFY.TRY_RECEIVE_ALL, {
          allMissingDataList: allReceiveData,
          onFinish: (err, allResults) => {
            cb(err, allResults)
          }
        });
      }
    ], (err, result) => {
      this._running = false;
      onEnd(err,result);
    });

  }
}
module.exports = ReceiveAllPipelineAction;

