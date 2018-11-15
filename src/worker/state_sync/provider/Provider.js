const EventEmitter = require('events').EventEmitter;
const CIDUtil = require('../../../common/CIDUtil');
const EngCID = require('../../../common/EngCID');
const parallel = require('async/parallel');
const pull = require('pull-stream');
const streams = require('../streams');
const constants = require('../../../common/constants');

class Provider extends EventEmitter {
  constructor(enigmaNode, logger) {
    super();
    this._enigmaNode = enigmaNode;
    this._logger = logger;
    streams.setGlobalState({logger : this._logger, context : this});
  }
  /** provide content in a batch of CID's
     * @param {Array<String>} descriptorsList - each element is a byte representation of some content
     * currently it's secret contract addresses
     * //TODO:: remove withEngCid to default true, leave now for compatability
     * @param {Boolean} withEngCid , if false: generate ecid
     * @param {Function} callback - (err,listOfFailedEngCIDs) = >{}
     * */
  provideContentsBatch(descriptorsList, withEngCid ,callback) {
    let engCIDs = descriptorsList;
    if(!withEngCid){
      engCIDs = descriptorsList.map((desc)=>{
        const h = CIDUtil.hashKeccack256(desc);
        return EngCID.createFromKeccack256(h);
      });
    }
    const jobs = [];

    engCIDs.forEach((ecid)=>{
      jobs.push((cb)=>{
        this._enigmaNode.provideContent(ecid, (err, ecid)=>{
          if (err) {
            this._logger.error(' error providing : ' + ecid.getKeccack256() + ' log = ' + err);
          } else {
            this._logger.info(' success providing : ' + ecid.getKeccack256());
          }
          cb(null, {error: err, ecid: ecid});
        });
      });
    });


    parallel(jobs, (err, results)=>{
      let isError = false;
      const failedCids = [];
      results.map((r)=>{
        if (r.error) {
          isError = true;
          failedCids.push(r.ecid);
        }
      });

      callback(isError, failedCids);
    });
  }
  /** stream related methods
   * MUST CONTAIN a "notification" field
   * specifying the concrete Action
   * */
  notify(params){
    this.emit('notify',params);
  }
  /**
   * Calls the worker/DbRequestAction
   * @param {JSON} request ,must contain the fields:
   * - onResponse(err,response)=>{}
   * - queryType, describe the query type needed
   * */
  dbRequest(request){
    if(request.hasOwnProperty('onResponse') && request.hasOwnProperty('queryType')){
      request.notification = constants.NODE_NOTIFICATIONS.DB_REQUEST;
      this.notify(request);
    }
  }
  startStateSyncResponse(connectionStream){
    pull(
        // read msg requests one-by-one
        connectionStream,
        // parse the message
        streams.requestParserStream,
        // get the requested data from db (i.e array of deltas)
        streams.fromDbStream,
        // serialize the database result into a network stream
        streams.toNetworkParser,
        // send the result to the msg request back to the receiver
        connectionStream
    );
  }
}

module.exports = Provider;
