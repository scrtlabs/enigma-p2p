const EventEmitter = require("events").EventEmitter;
const CIDUtil = require("../../../common/CIDUtil");
const EngCID = require("../../../common/EngCID");
const parallel = require("async/parallel");
const pull = require("pull-stream");
const constants = require("../../../common/constants");
const SyncMsgMgmgt = require("../../../policy/p2p_messages/sync_messages");
const SyncMsgBuilder = SyncMsgMgmgt.MsgBuilder;

class Provider extends EventEmitter {
  constructor(enigmaNode, logger) {
    super();
    this._enigmaNode = enigmaNode;
    this._logger = logger;
  }
  /** provide content in a batch of CID's
   * @param {Array<String>} descriptorsList - each element is a byte representation of some content
   * currently it's secret contract addresses
   * //TODO:: remove withEngCid to default true, leave now for compatability
   * @param {Boolean} withEngCid , if false: generate ecid
   * @param {Function} callback - (err,listOfFailedEngCIDs) = >{}
   * */
  provideContentsBatch(descriptorsList, withEngCid, callback) {
    let engCIDs = descriptorsList;
    if (!withEngCid) {
      engCIDs = descriptorsList.map(desc => {
        const h = CIDUtil.hashKeccack256(desc);
        return EngCID.createFromKeccack256(h);
      });
    }
    const jobs = [];

    engCIDs.forEach(ecid => {
      jobs.push(cb => {
        this._enigmaNode.provideContent(ecid, (err, ecid) => {
          if (err) {
            this._logger.debug(`received an error while trying to provide ${ecid} = ${err}`);
          }
          cb(null, { error: err, ecid: ecid });
        });
      });
    });

    parallel(jobs, (err, results) => {
      const failedCids = [];
      results.map(r => {
        if (r.error) {
          failedCids.push(r.ecid);
        }
      });
      callback(failedCids);
    });
  }
  /** async version of provideContentsBatch */
  asyncProvideContentsBatch(engCids) {
    return new Promise((resolve, reject) => {
      this.provideContentsBatch(engCids, true, failedCids => {
        resolve(failedCids);
      });
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
   * Calls the worker/DbRequestAction
   * @param {JSON} request ,must contain the fields:
   * - onResponse(err,response)=>{}
   * - queryType, describe the query type needed
   * */
  dbRequest(request) {
    if (request.hasOwnProperty("onResponse") && request.hasOwnProperty("dbQueryType")) {
      if (request.dbQueryType === constants.CORE_REQUESTS.GetDeltas) {
        request.notification = constants.NODE_NOTIFICATIONS.GET_DELTAS;
      } else if (request.dbQueryType === constants.CORE_REQUESTS.GetContract) {
        request.notification = constants.NODE_NOTIFICATIONS.GET_CONTRACT_BCODE;
      }
      this.notify(request);
    }
  }
  startStateSyncResponse(connectionStream) {
    pull(
      // read msg requests one-by-one
      connectionStream,
      // parse the message
      this._requestParserStream.bind(this),
      // get the requested data from db (i.e array of deltas)
      this._fromDbStream.bind(this),
      // serialize the database result into a network stream
      this._toNetworkParse.bind(this),
      // send the result to the msg request back to the receiver
      connectionStream
    );
  }
  // this takes result from the db (done by the provider) and
  // returns the result directly into the other peer stream (source)
  _toNetworkParse(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          if (data.type === constants.CORE_REQUESTS.GetDeltas) {
            data.msgType = constants.P2P_MESSAGES.SYNC_STATE_RES;
          } else if (data.type === constants.CORE_REQUESTS.GetContract) {
            data.msgType = constants.P2P_MESSAGES.SYNC_BCODE_RES;
          }
          const msg = new SyncMsgMgmgt.SyncStateResMsg(data);
          cb(end, msg.toNetwork());
        } else {
          cb(end, null);
        }
      });
    };
  }

  // fake load from the database, this will return the deltas for the requester
  _fromDbStream(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          // TODO:: create a db call ...
          // TODO:: validate that the range < limit here or somewhere else.
          let queryType = null;
          if (data.type() === constants.P2P_MESSAGES.SYNC_BCODE_REQ) {
            queryType = constants.CORE_REQUESTS.GetContract;
          } else if (data.type() === constants.P2P_MESSAGES.SYNC_STATE_REQ) {
            queryType = constants.CORE_REQUESTS.GetDeltas;
          } else {
            // TODO:: handle error
            const err = `wrong message type=${queryType} in fromDBstrem`;
            this._logger.error(err);
            cb(err, null);
          }
          this.dbRequest({
            dbQueryType: queryType,
            requestMsg: data,
            onResponse: (err, dbResult) => {
              if (err) {
                cb(err, null);
              } else {
                cb(end, dbResult);
              }
            }
          });
        } else {
          cb(end, null);
        }
      });
    };
  }

  _requestParserStream(read) {
    return (end, cb) => {
      read(end, (end, data) => {
        if (data != null) {
          // TODO:: validate network input validity
          let parsedData = SyncMsgBuilder.requestMessageFromNetwork(data);
          if (parsedData === null) {
            cb(true, null);
          } else {
            cb(end, parsedData);
          }
        } else {
          cb(end, null);
        }
      });
    };
  }
}

module.exports = Provider;
