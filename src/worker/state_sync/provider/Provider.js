const EventEmitter = require('events').EventEmitter;
const CIDUtil = require('../../../common/CIDUtil');
const EngCID = require('../../../common/EngCID');
const parallel = require('async/parallel');
const pull = require('pull-stream');
const streams = require('../streams');

class Provider extends EventEmitter{

    constructor(enigmaNode, logger){
        super();

        this._enigmaNode = enigmaNode;
        this._logger = logger;

    }
    /** provide content in a batch of CID's
     * @param {Array<String>} descriptorsList - each element is a byte representation of some content
     * currently it's secret contract addresses
     * @param {Function} callback - (err,listOfFailedEngCIDs) = >{}
     * */
    provideContentsBatch(descriptorsList,callback){

        let engCIDs = descriptorsList.map(desc=>{
            let h = CIDUtil.hashKeccack256(desc);
            return EngCID.createFromKeccack256(h);
        });


        let jobs = [];

        engCIDs.forEach(ecid=>{
            jobs.push((cb)=>{

                this._enigmaNode.provideContent(ecid, (err,ecid)=>{
                    if(err){
                        this._logger.error(" error providing : " + ecid.getKeccack256() + " log = " + err);
                    }else{
                        this._logger.info(" success providing : " + ecid.getKeccack256());
                    }
                    cb(null,{error: err, ecid : ecid});
                });
            })
        });


        parallel(jobs, (err,results)=>{

            let isError = false;
            let failedCids = [];
            results.map(r=>{
                if(r.error){
                    isError = true;
                    failedCids.push(r.ecid);
                }
            });

            callback(isError, failedCids);
        });
    }

    startStateSyncResponse(connectionStream){
        pull(
            connectionStream,
            streams.requestParserStream,
            streams.fromDbStream,
            streams.toNetworkParser,
            connectionStream
        );
    }

}

module.exports = Provider;