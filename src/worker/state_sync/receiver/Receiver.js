const EventEmitter = require('events').EventEmitter;
const CIDUtil = require('../../../common/CIDUtil');
const EngCID = require('../../../common/EngCID');
const parallel = require('async/parallel');
const Policy = require('../../../policy/policy');
const FindProviderResult = require('./FindProviderResult');
const pull = require('pull-stream');
const streams = require('../streams');

class Receiver extends EventEmitter {
  constructor(enigmaNode, logger) {
    super();

    // TODO:: take policy from the outside no need in ANOTHER instance in memory.
    this._policy = new Policy();
    this._engNode = enigmaNode;
    this._logger = logger;
  }

  /**
     * internal wrapper - Find provider for some CID
     * @param {EngCID} engCid, the content cid
     * @param {Integer} timeout, in milliseconds before returning an error
     * @param {Function} callback, (err,providers)=>{} , providers is {PeerInfo}
     * */
  _findProvider(engCid, timeout, callback) {
    this._engNode.findContentProvider(engCid, timeout, (err, providers)=>{
      callback(err, providers);
    });
  }
  /** find providers for some content in a batch mode
     * On error check findProviderResult.isCompleteError() => general error in the process
     * findProviderResult.isErrors() => means that some had errors.
     *
     * @callback findProviderResult
     * @param {Array<String>} descriptorsList - each element is a byte representation of some content
     * @param {Function} callback , (FindProviderResult)=>{} , class {FindProviderResult}
     * */
  findProvidersBatch(descriptorsList, callback) {
    const timeout = this._policy.getTimeoutFindProvider();
    const engCids = descriptorsList.map((desc)=>{
      const h = CIDUtil.hashKeccack256(desc);
      return EngCID.createFromKeccack256(h);
    });


    const jobs = [];

    // define each jobs
    engCids.forEach((ecid)=>{
      jobs.push((cb)=>{
        this._findProvider(ecid, timeout, (err, providers)=>{
          cb(null, {error: err, ecid: ecid, providers: providers});
        });
      });
    });

    // execute jobs

    parallel(jobs, (err, result)=>{
      const findProviderResult = new FindProviderResult();

      if (err) {
        this._logger.error('[-] complete error findProvidersBatch ' + err);
        findProviderResult.setCompleteError();
      } else {
        result.forEach((res)=>{
          if (res.error) {
            this._logger.error('[-] error in findProvider specific CID ' + res.error);
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
     * */
  startStateSyncRequest(peerInfo, stateSyncReqMsgs) {
    this._engNode.startStateSyncRequest(peerInfo, (err, connectionStream)=>{
      pull(
          pull.values(stateSyncReqMsgs),
          streams.toNetworkSyncReqParser,
          connectionStream,
          streams.verificationStream,
          streams.toDbStream
      );
    });
  }
  trySyncOneContractOneRequest(peerInfo, stateSyncReqMsgs, callbackEachChunk){
      this._engNode.startStateSyncRequest(peerInfo, (err,connectionStream)=>{
        if(err){
          callbackEachChunk(err);
        }else{
            pull(
                pull.values(stateSyncReqMsgs),
                streams.toNetworkSyncReqParser,
                connectionStream,
                streams.verificationStream,
                streams.throughDbStream,
                pull.map(data=>{
                  //TODO:: this is only used for the callback
                  console.log("[AfterDbThrough] : " + data);
                  callbackEachChunk(null,data);
                  return data;
                }),
                pull.drain()
            );
        }
      });
  }
}
module.exports = Receiver;
