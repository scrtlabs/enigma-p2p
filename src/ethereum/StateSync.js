const parallel = require('async/parallel');

async function getRemoteMissingStates(api, localTips, callback) {
    let remoteSecretContractNumber = await api.countSecretContracts();
    let remoteSecretContractsAddresses = await api.getSecretContractAddresses(0, remoteSecretContractNumber);
    
    // get the number of all deltas for each contract in remote (each job will return: {address: secretContractAddress, deltasNumber: size})
    // initiate jobs
    let remoteDeltaNumberJobs = [];
    remoteSecretContractsAddresses.forEach((secretContractAddress)=>{
        remoteDeltaNumberJobs.push((cb)=>{
            api.countStateDeltas(secretContractAddress)
                .then((size)=>{
                    return cb(null, {address: secretContractAddress, deltasNumber: size} );
        });
      });
    });
    
    // execute remoteDeltaNumberJobs
    // each result : {address, deltaNumber}
    parallel(remoteDeltaNumberJobs, (err, results)=>{
        
        // get all actual hashes
        let missingDeltasJobs = [];
        
        results.forEach((res)=>{
            // init jobs
            missingDeltasJobs.push((cb)=>{
                
                let address = res.address;
                let deltasNumber = res.deltasNumber;
                
                let firstMissingIndex = 0;
                // get the local tip index, if exists; otherwise 0
                if (address in localTips) {
                    firstMissingIndex = localTips.address + 1;
                }
                // there are no missing deltas for this secret contract address 
                if (deltaNumber == nextIndex) {
                    callback(null)
                } 
                else {// (deltasNumber > nextIndex) {
                    api.getStateDeltaHashes(address, firstMissingIndex, deltasNumber)
                        .then((deltasArray)=>{
                            let parsedDeltasArray = [];
                            deltasArray.forEach((deltaHash, index, arr)=>{
                                parsedDeltasArray.push({deltaHash : deltaHash, index : index + firstMissingIndex});
                            });
                            return cb(null, {address : address, deltas : parsedDeltasArray});
                        });
                }
                
            });
        });
        
        //execute remoteDeltaNumberJobs
        parallel(remoteDeltaNumberJobs, (err, results)=>{
            //DONE results == [{address, deltas : [deltaHash, index]}]
            callback(results);
        });
    });
  }
  

  async function getRemoteMissingStates2(api, localTips, callback) {
    let remoteSecretContractNumber = await api.countSecretContracts();
    let remoteSecretContractsAddresses = await api.getSecretContractAddresses(0, remoteSecretContractNumber);
    
    console.log("remoteSecretContractNumber=" + remoteSecretContractNumber);
    console.log("remoteSecretContractsAddresses=" + remoteSecretContractsAddresses);
    // get the number of all deltas for each contract in remote (each job will return: {address: secretContractAddress, deltasNumber: size})
    // initiate jobs
    let jobs = [];
    remoteSecretContractsAddresses.forEach((secretContractAddress)=>{
        jobs.push((cb)=>{
            console.log("inside a job");
            api.countStateDeltas(secretContractAddress).then((x)=>{
                console.log("inside then");
                return cb(null, '2');
            });
            //let count = await api.countStateDeltas(secretContractAddress);
            //console.log("count=" + count);
            //return cb(null, '1');
        })
    });
        // jobs.push((cb)=>{
        //     console.log("address " + secretContractAddress);
        //     api.countStateDeltas(secretContractAddress)
        //         .then((deltasNumber)=>{
        //             console.log("address " + secretContractAddress + " has " + deltasNumber + " state deltas");
        //             // get the local tip index, if exists; otherwise 0
        //             if (secretContractAddress in localTips) {
        //                 firstMissingIndex = localTips.address + 1;
        //             }
        //             // there are no missing deltas for this secret contract address 
        //             if (deltasNumber === nextIndex) {
        //                 console.log("no missing deltas");
        //                 return cb(null);
        //             } 
        //             else {// (deltasNumber > nextIndex) {
        //                 api.getStateDeltaHashes(secretContractAddress, firstMissingIndex, deltasNumber)
        //                     .then((deltasArray)=>{
        //                         console.log("address " + secretContractAddress + " has " + deltasArray);
        //                         let parsedDeltasArray = [];
        //                         deltasArray.forEach((deltaHash, index, arr)=>{
        //                             parsedDeltasArray.push({deltaHash : deltaHash, index : index + firstMissingIndex});
        //                         });
        //                         console.log("returning " + {address : address, deltas : parsedDeltasArray});
        //                         return cb(null, {address : address, deltas : parsedDeltasArray});
        //                     });
        //             }
        //     });
        // });
    // });
    
    //console.log("jobs=" + jobs);
    console.log("BEFORE PARALLEL");
    // execute remoteDeltaNumberJobs
    // each result : {address, deltaNumber}
    parallel(jobs, (err, results)=>{
        //DONE results == [{address, deltas : [deltaHash, index]}]
        console.log("INSIDE PARALLEL");
        console.log("err=" + err);
        console.log("results=" + results);
        return callback(results);
    });
  }

  module.exports = {getRemoteMissingStates: getRemoteMissingStates2};



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
