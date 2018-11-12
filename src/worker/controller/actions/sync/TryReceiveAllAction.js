/**
 * This can fail.
 * Given an input:
 * - Missing deltas
 * - CID's and ProviderList for EACH CID (FindProviderResult.js)
 * Fetch from the providers all the bytecode/deltas
 * */
const waterfall = require('async/waterfall');

class TryReceiveAllAction{
  constructor(controller){
    this._controller = controller;
  }
  /**
   * @param {JSON} params : {
   *  - findProvidersResult
   *  - missingStates
   *  - onFinish
   * }*/
  execute(params){
    let findProvidersResult = params.findProvidersResult;
    let missingStates = params.missingStates;
    let onFinish = params.onFinish;
    let keysList = findProvidersResult.getKeysList();
    let providersMap = findProvidersResult.getProvidersMap();
    //TODO:: define missingStates created by IdentifyMissingStatesAction action
    let jobs = [];
    // init the first job
    let firstJobKey = keysList.pop();
    let firstJobProviders = providersMap[firstJobKey];
    //TODO:: each jobs should get different missing states so maybe something like
    //TODO:: let cidMissingJobs = missingStates.forCid(cid) or something and use it for each job
    jobs.push(cb=>{
      this._controller.receiver().trySyncReceive(firstJobProviders, missingStates, (err,isDone,resultList)=>{
        let allResults = [];
        allResults.push({success : isDone, resultList : resultList, error : err});
        cb(null,allResults);
      });
    });
    // init rest of the jobs
    keysList.forEach(k=>{
      let providers = providersMap[k];
      jobs.push((allResults, cb)=>{
        this._controller.receive().trySyncReceive(providers, missingStates , (err, isDone, resultList)=>{
          allResults.push({success : isDone, resultList : resultList, error : err});
          cb(null,allResults);
        });
      });
    });
    // execute all jobs
    waterfall(jobs, (err,allResults)=>{
      if(onFinish){
        onFinish(err,allResults);
      }else{
        //TODO:: implement something here :)
        console.log("err ? " + err );
        console.log("all results = > " , allResults);
      }
    });
  }
}
module.exports = TryReceiveAllAction;
