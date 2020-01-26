const EventEmitter = require("events").EventEmitter;
const CIDUtil = require("../../../common/CIDUtil");
const EngCID = require("../../../common/EngCID");
const parallel = require("async/parallel");
const Policy = require("../../../policy/policy");
const FindProviderResult = require("./FindProviderResult");
const pull = require("pull-stream");
const waterfall = require("async/waterfall");
const constants = require("../../../common/constants");
const Verifier = require("./StateSyncReqVerifier");
const SyncMsgMgmgt = require("../../../policy/p2p_messages/sync_messages");
const SyncMsgBuilder = SyncMsgMgmgt.MsgBuilder;

class Receiver extends EventEmitter {
  constructor(enigmaNode, logger) {
    super();
    // TODO:: take policy from the outside no need in ANOTHER instance in memory.
    this._policy = new Policy();
    this._engNode = enigmaNode;
    this._logger = logger;
    this._remoteMissingStatesMap = null;
  }

  /**
   * internal wrapper - Find provider for some CID
   * @param {EngCID} engCid, the content cid
   * @param {Integer} timeout, in milliseconds before returning an error
   * @param {Function} callback, (err,providers)=>{} , providers is {PeerInfo}
   * */
  _findProvider(engCid, timeout, callback) {
    this._engNode.findContentProvider(engCid, timeout, (err, providers) => {
      providers.filter(provider => {
        return !(provider.id.toB58String() === this._engNode.getSelfIdB58Str());
      });
      callback(err, providers);
    });
  }
  /** stream related methods
   * MUST CONTAIN a "notification" field
   * specifying the concrete Action
   * */
  notify(params) {
    this.emit("notify", params);
  }
  /**
   * Calls the worker/DbWriteAction
   * @param {JSON} request ,must contain the fields: , callback(err,status) , data
   * */
  dbWrite(request) {
    if (request.hasOwnProperty("callback") && request.hasOwnProperty("data")) {
      request.notification = constants.NODE_NOTIFICATIONS.UPDATE_DB;
      this.notify(request);
    } else {
      // TODO:: callback might be a missing field for some reason BUT it's ok since it better to crash here than sleep, fix later gracefully.
      request.callback("err missing fields");
    }
  }
  /** find providers for some content in a batch mode
   * On error check findProviderResult.isCompleteError() => general error in the process
   * findProviderResult.isErrors() => means that some had errors.
   *
   * @callback findProviderResult
   * @param {Array<String>} descriptorsList - each element is a byte representation of some content
   * * //TODO:: remove withEngCid to default true, leave now for compatability
   * @param {Boolean} withEngCid , if false: generate ecid
   * @param {Function} callback , (FindProviderResult)=>{} , class {FindProviderResult}
   * */
  findProvidersBatch(descriptorsList, withEngCid, callback) {
    const timeout = constants.CONTENT_ROUTING.TIMEOUT_FIND_PROVIDER;
    let engCids = descriptorsList;
    if (!withEngCid) {
      engCids = descriptorsList.map(desc => {
        const h = CIDUtil.hashKeccack256(desc);
        return EngCID.createFromKeccack256(h);
      });
    }
    const jobs = [];
    // define each jobs
    engCids.forEach(ecid => {
      jobs.push(cb => {
        this._findProvider(ecid, timeout, (err, providers) => {
          cb(null, { error: err, ecid: ecid, providers: providers });
        });
      });
    });
    // execute jobs
    parallel(jobs, (err, result) => {
      const findProviderResult = new FindProviderResult();
      if (err) {
        this._logger.error("[-] complete error findProvidersBatch " + err);
        findProviderResult.setCompleteError();
      } else {
        result.forEach(res => {
          if (res.error) {
            this._logger.error("[-] error in findProvider specific CID " + res.error);
            findProviderResult.addErroredProviderResult(res.ecid, res.error);
          } else {
            findProviderResult.addProviderResult(res.ecid, res.providers);
          }
        });
      }
      callback(findProviderResult);
    });
  }
  /**
   * @param {PeerInfo}  peerInfo , the peer provider
   * @param {Array<StateSyncReqMsg>} stateSyncReqMsgs
   * @param {Function} callback , (err,ResultList)=>{}
   * */
  trySyncOneContractOneRequest(peerInfo, stateSyncReqMsgs, callback) {
    this._engNode.startStateSyncRequest(peerInfo, (err, connectionStream) => {
      if (err) {
        return callback(err);
      }
      pull(
        pull.values(stateSyncReqMsgs),
        this._toNetworkSyncReqParser.bind(this),
        connectionStream,
        this._verificationStream.bind(this),
        this._throughDbStream.bind(this),
        pull.map(data => {
          const status = {};
          status.ipcType = data.status.type;
          status.msgType = data.data.type();
          status.success = data.status.success;
          status.payload = data.data;
          return status;
        }),
        pull.collect((err, resultList) => {
          if (err) {
            this._logger.error("collection err " + err);
            return callback(err, resultList);
          } else {
            return callback(null, resultList);
          }
        })
      );
    });
  }
  /**
   * try and sync 1 contract (all deltas and code)  given a list of potential providers.
   * init bunch of waterfall functions (jobs) to call trySyncOneContractOneRequest
   * the amount of jobs == providersList.length
   * it will propagate the result from one jobs to another:
   * - if the previous job == success: => forward the result
   * - else: => retry trySyncOneContractOneRequest
   *
   * @param {Array<PeerInfo>} providersList
   * @param {Array<StateSyncReqMsg>} stateSyncMsgs
   * //TODO:: define what resultList contains
   * @param {Function} callback , (err,isDone,resultList)=>{}
   * */
  trySyncReceive(providersList, stateSyncMsgs, callback) {
    const jobs = [];
    // init first job
    const ctx = this;
    jobs.push(cb => {
      ctx.trySyncOneContractOneRequest(providersList[0], stateSyncMsgs, (err, resultList) => {
        let isDone = true;
        if (err) {
          // general error - retry
          isDone = false;
          cb(null, isDone, resultList);
        } else {
          // were done.
          cb(null, isDone, resultList);
        }
      });
    });

    // init rest of the jobs except the last one
    for (let i = 1; i < providersList.length - 1; ++i) {
      jobs.push((isDone, resultList, cb) => {
        if (isDone) {
          // were done.
          return cb(null, isDone, resultList);
        } else {
          // retry
          ctx.trySyncOneContractOneRequest(providersList[i], stateSyncMsgs, (err, resultList) => {
            let isDone = true;
            if (err) {
              // general error - retry
              isDone = false;
            }
            // were done.
            return cb(null, isDone, resultList);
          });
        }
      });
    }

    jobs.push((isDone, resultList, cb) => {
      if (isDone) {
        // were done.
        return cb(null, isDone, resultList);
      } else {
        // some error - retry
        ctx.trySyncOneContractOneRequest(providersList[providersList.length - 1], stateSyncMsgs, (err, resultList) => {
          // finish regardless if it worked or not.
          if (err) {
            // finish with error
            return cb(err, false, resultList);
          } else {
            // finish with success
            return cb(null, true, resultList);
          }
        });
      }
    });

    waterfall(jobs, (err, isDone, resultList) => {
      callback(err, isDone, resultList);
    });
  }
  /**
   * set the missing state needed for the sync scenario
   * @param {Object} remoteMissingStatesMap
   * */
  setRemoteMissingStatesMap(remoteMissingStatesMap) {
    this._remoteMissingStatesMap = remoteMissingStatesMap;
  }

  _throughDbStream(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          this.dbWrite({
            data: data,
            callback: (err, status) => {
              if (!status || err) {
                this._logger.error(`an error received while trying to save to DB`);
                throw end;
              } else {
                cb(end, { status: status, data: data });
              }
            }
          });
        } else {
          cb(end, null);
        }
      });
    };
  }

  _toNetworkSyncReqParser(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          cb(end, data.toNetwork());
        } else {
          cb(end, null);
        }
      });
    };
  }

  _verificationStream(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          data = SyncMsgBuilder.responseMessageFromNetwork(data);
          if (data == null) {
            return cb(true, null);
          }
          // verify the data
          Verifier.verify(this._remoteMissingStatesMap, data, (err, isOk) => {
            if (isOk) {
              return cb(end, data);
            } else {
              return cb("Error in verification with Ethereum: " + err, null);
            }
          });
        } else {
          return cb(end, null);
        }
      });
    };
  }
}
module.exports = Receiver;
