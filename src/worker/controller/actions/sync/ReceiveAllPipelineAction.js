const constants = require("../../../../common/constants");
const errs = require("../../../../common/errors");
const NODE_NOTIFY = constants.NODE_NOTIFICATIONS;
const EngCid = require("../../../../common/EngCID");
const LocalMissingStateResult = require("../../../state_sync/receiver/LocalMissingStatesResult");

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

  async execute(params) {
    const onEnd = params.onEnd;

    if (this._running) {
      return onEnd(new errs.SyncReceiverErr("already running"));
    }
    this._running = true;

    try {
      // Compare between the local state and Ethereum
      const { missingList, excessList } = await this._controller.asyncExecCmd(
        NODE_NOTIFY.IDENTIFY_MISSING_STATES_FROM_REMOTE,
        {}
      );

      // Build messages for sync
      const missingStatesMsgsMap = buildMissingStatesResult(missingList);

      let ecids = [];
      // TODO:: should work completely without tempEcidToAddrMap -> delete it from all over the code here.
      const tempEcidToAddrMap = {};
      for (const addrKey in missingStatesMsgsMap) {
        const ecid = EngCid.createFromSCAddress(addrKey);
        if (ecid) {
          tempEcidToAddrMap[ecid.getKeccack256()] = addrKey;
          ecids.push(ecid);
        } else {
          return onEnd(new errs.SyncReceiverErr(`error creating EngCid from ${addrKey}`));
        }
      }
      // Search for content providers
      const findProviderResult = await this._controller.asyncExecCmd(NODE_NOTIFY.FIND_CONTENT_PROVIDER, {
        descriptorsList: ecids,
        isEngCid: true
      });
      if (findProviderResult.isCompleteError() || findProviderResult.isErrors()) {
        return new errs.SyncReceiverErr("some error finding providers !");
      }

      // parse to 1 object: cid => {providers, msgs} -> simple :)
      const allReceiveData = [];
      ecids.forEach(ecid => {
        allReceiveData.push({
          requestMessages: missingStatesMsgsMap[ecid.getScAddress()],
          providers: findProviderResult.getProvidersFor(ecid)
        });
      });

      // Sync
      const allResults = await this._controller.asyncExecCmd(NODE_NOTIFY.TRY_RECEIVE_ALL, {
        allMissingDataList: allReceiveData,
        remoteMissingStatesMap: transformMissingStatesListToMap(missingList)
      });

      // Revert local state
      for (const contract of excessList) {
        let coreMsg = null;
        if (contract.remoteTip === -1) {
          // meaning the entire contract should be removed
          coreMsg = {
            address: contract.address,
            type: constants.CORE_REQUESTS.RemoveContract
          };
          this._controller.logger().info(`[SYNC] deleting contract ${contract.address}`);
        } else {
          coreMsg = {
            input: [{ address: contract.address, from: contract.remoteTip + 1, to: contract.localTip }],
            type: constants.CORE_REQUESTS.RemoveDeltas
          };
          this._controller
            .logger()
            .info(`[SYNC] reverting deltas ${coreMsg.input.from}-${coreMsg.input.to} of contract ${contract.address}`);
        }
        await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.UPDATE_DB, { data: coreMsg });
      }
      this._running = false;
      onEnd(null, allResults);
    } catch (err) {
      this._running = false;
      this._controller.logger().error(`[SYNC] error= ${err}`);
      onEnd(err);
    }
  }
}

function buildMissingStatesResult(missingList) {
  const result = LocalMissingStateResult.createP2PReqMsgsMap(missingList);
  const missingStatesMsgsMap = {};
  for (const addrKey in result) {
    const obj = result[addrKey];
    if (obj.bcodeReq) {
      obj.deltasReq.push(obj.bcodeReq);
    }
    missingStatesMsgsMap[addrKey] = obj.deltasReq;
  }
  return missingStatesMsgsMap;
}
function transformMissingStatesListToMap(missingStatesList) {
  const missingStatesMap = {};
  for (let i = 0; i < missingStatesList.length; ++i) {
    const deltasMap = {};
    for (let j = 0; j < missingStatesList[i].deltas.length; j++) {
      const index = missingStatesList[i].deltas[j].index;
      const deltaHash = missingStatesList[i].deltas[j].deltaHash;
      deltasMap[index] = deltaHash;
    }
    if ("bytecodeHash" in missingStatesList[i]) {
      missingStatesMap[missingStatesList[i].address] = {
        deltas: deltasMap,
        bytecodeHash: missingStatesList[i].bytecodeHash
      };
    } else {
      missingStatesMap[missingStatesList[i].address] = { deltas: deltasMap };
    }
  }
  return missingStatesMap;
}

module.exports = ReceiveAllPipelineAction;
