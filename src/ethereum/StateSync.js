const parallel = require('async/parallel');

const util = require('util')

const _ = require('underscore');

async function getRemoteMissingStates(api, localTips, callback) {
    let remoteSecretContractNumber = await api.countSecretContracts();
    let remoteSecretContractsAddresses = await api.getSecretContractAddresses(0, remoteSecretContractNumber);
    
    // create a hashmap from the localTipa array
    const tipsHashMaps = localTips.reduce((obj, item) => {
        obj[item.address] = item.key;
        return obj
      }, {});

   
    // initiate jobs
    let jobs = [];
    remoteSecretContractsAddresses.forEach((secretContractAddress)=>{
        jobs.push((cb)=>{
            api.countStateDeltas(secretContractAddress)
                .then((deltasNumber)=>{
                    let firstMissingIndex = 0;
                    // get the local tip index, if exists; otherwise 0
                    if (secretContractAddress in tipsHashMaps) {
                        firstMissingIndex = tipsHashMaps[secretContractAddress] + 1;
                    }
                    // there are no missing deltas for this secret contract address 
                    if (deltasNumber === firstMissingIndex) {
                        return cb(null);
                    } 
                    else {// (deltasNumber > firstMissingIndex) {
                        api.getStateDeltaHashes(secretContractAddress, firstMissingIndex, deltasNumber)
                            .then((deltasArray)=>{
                                let parsedDeltasArray = [];
                                deltasArray.forEach((deltaHash, index, arr)=>{
                                    parsedDeltasArray.push({deltaHash : deltaHash, index : index + firstMissingIndex});
                                });
                                return cb(null, {address : secretContractAddress, deltas : parsedDeltasArray});
                            });
                    }
            });
        });
    });
    

    parallel(jobs, (err, results)=>{
        //DONE results == [{address, deltas : [deltaHash, index]}]
        
        // Filter out undefined - due to synced addresses
        var filtered = _.filter(results, function(x) {
            return (x===undefined ? false : true);
          });
        console.log("filtered="+ util.inspect(filtered, {showHidden: false, depth: null}));
        return callback(filtered);
    });
}

module.exports = {getRemoteMissingStates: getRemoteMissingStates};



//   function asyncGetMissingStates(eth,localTips){
//     return new Promise((resolve,reject)=>{
//       getMissingStates(eth,localTips,(err,result)=>{
//         if(err){
//           reject(err);
//         }else{
//           resolve(result);
//         }
//       }).catch(e=>{
//         reject(e);
//       });
//     });
//   }
