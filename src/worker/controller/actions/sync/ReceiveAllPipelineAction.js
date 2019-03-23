const constants = require('../../../../common/constants');
const errs = require('../../../../common/errors');
const NODE_NOTIFY = constants.NODE_NOTIFICATIONS;
const waterfall = require('async/waterfall');
const EngCid = require('../../../../common/EngCID');

const util = require('util');

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
    const cache = params.cache;
    const onEnd = params.onEnd;

    if (this._running) {
      return onEnd(new errs.SyncReceiverErr('already running'));
    }
    this._running = true;
    const getMissingStates = (cb)=>{
      this._controller.execCmd(
          NODE_NOTIFY.IDENTIFY_MISSING_STATES_FROM_REMOTE, {
            cache: cache,
            onResponse: (err, res) => {
              if (err) {
                return cb(err);
              }
              return cb(null, res.missingStatesMsgsMap, res.missingStatesMap);
            },
          });
    };
    const parseResults = (missingStatesMsgsMap, remoteMissingStatesMap, cb) => {
      let err = null;
      const ecids = [];
      // TODO:: should work completley without tempEcidToAddrMap -> delete it from all over the code here.
      const tempEcidToAddrMap = {};
      for (const addrKey in missingStatesMsgsMap) {
        const ecid = EngCid.createFromSCAddress(addrKey);
        if (ecid) {
          tempEcidToAddrMap[ecid.getKeccack256()] = addrKey;
          ecids.push(ecid);
        } else {
          err = new err.SyncReceiverErr(`error creating EngCid from ${addrKey}`);
        }
      }
      return cb(err, ecids, missingStatesMsgsMap, tempEcidToAddrMap, remoteMissingStatesMap);
    };
    const findPRovider = (ecidList, missingStatesMap, tempEcidToAddrMap, remoteMissingStatesMap, cb) => {
      this._controller.execCmd(NODE_NOTIFY.FIND_CONTENT_PROVIDER, {
        descriptorsList: ecidList,
        isEngCid: true,
        next: (findProviderResult) => {
          return cb(null, findProviderResult, ecidList, missingStatesMap, tempEcidToAddrMap, remoteMissingStatesMap);
        },
      });
    };
    const parseProviders = (findProviderResult, ecids, missingStatesMap, tempEcidToAddrMap, remoteMissingStatesMap, cb) => {
      if (findProviderResult.isCompleteError() || findProviderResult.isErrors()) {
        cb(new errs.SyncReceiverErr('[-] some error finding providers !'));
      }
      // parse to 1 object: cid => {providers, msgs} -> simple :)
      const allReceiveData = [];
      ecids.forEach((ecid) => {
        allReceiveData.push({
          requestMessages: missingStatesMap[ecid.getScAddress()],
          providers: findProviderResult.getProvidersFor(ecid),
        });
      });
      return cb(null, allReceiveData, remoteMissingStatesMap);
    };
    const receiveAll = (allReceiveData, remoteMissingStatesMap, cb) => {
      this._controller.execCmd(NODE_NOTIFY.TRY_RECEIVE_ALL, {
        allMissingDataList: allReceiveData,
        remoteMissingStatesMap: remoteMissingStatesMap,
        onFinish: (err, allResults) => {
          cb(err, allResults);
        },
      });
    };
    waterfall([
      getMissingStates,
      parseResults,
      findPRovider,
      parseProviders,
      receiveAll,
    ], (err, result) => {
      this._running = false;
      onEnd(err, result);
    });
  }
}
module.exports = ReceiveAllPipelineAction;

