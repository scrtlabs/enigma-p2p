const parallel = require('async/parallel');

const _ = require('underscore');

/**
 * Queries the Enigma contract and returns the missing states in comparison to the local tips
 * @param {EnigmaContractReaderAPI} api
 * @param {Array} localTips [{address,key,delta},...}]
 * @param {Function} callback (err, results)=>{}
 * @return {Array} missing states [{address, deltas : [deltaHash, index]}].
 *                 In case the entire contract is missing, the bytecode is returned as well:
 *                 [{address, bytecode , deltas : [deltaHash, index]}]
 * TODO: as async function returns a Promise, apply both options: return the data using the callback
 * and return the data using the promise
 * */
async function getRemoteMissingStates(api, localTips, callback) {
  // create a hashmap from the localTips array
  const tipsHashMaps = localTips.reduce((obj, item) => {
    obj[item.address] = item.key;
    return obj;
  }, {});

  try {
    const remoteSecretContractNumber = await api.countSecretContracts();

    try {
      const remoteSecretContractsAddresses = await api.getSecretContractAddresses(0, remoteSecretContractNumber);

      // initiate jobs
      const jobs = [];
      remoteSecretContractsAddresses.forEach((secretContractAddress)=>{
        jobs.push((cb)=>{
          api.countStateDeltas(secretContractAddress)
              .then(async (deltasNumber)=>{
                let missingAddress = false;
                let firstMissingIndex;
                let missingCodeHash;
                // get the local tip index, if exists; otherwise 0
                if (secretContractAddress in tipsHashMaps) {
                  firstMissingIndex = tipsHashMaps[secretContractAddress] + 1;
                  // TODO:: lena: once newly deployed contracts will hold a first delta, this should be removed
                  if (deltasNumber === firstMissingIndex) {
                    return cb(null);
                  }
                }
                // the address does not exist at the local db, set the firstMissingIndex to 0 and request the codehash
                else {
                  firstMissingIndex = 0;
                  missingAddress = true;
                  missingCodeHash = await api.getCodeHash(secretContractAddress);
                }
                // TODO:: lena: once newly deployed contracts will hold a first delta, this should be un-commented
                // there are no missing deltas for this secret contract address
                // if (deltasNumber === firstMissingIndex) {
                //     return cb(null);
                // }
                // else {// (deltasNumber > firstMissingIndex) {
                api.getStateDeltaHashes(secretContractAddress, firstMissingIndex, deltasNumber)
                    .then((deltasArray)=>{
                      const parsedDeltasArray = [];
                      deltasArray.forEach((deltaHash, index)=>{
                        parsedDeltasArray.push({deltaHash: deltaHash, index: index + firstMissingIndex});
                      });
                      if (missingAddress === true) {
                        return cb(null, {address: secretContractAddress, deltas: parsedDeltasArray,
                          bytecode: missingCodeHash});
                      }
                      return cb(null, {address: secretContractAddress, deltas: parsedDeltasArray});
                    })
                    .catch((err)=>{
                      cb(err);
                    });
                // }
              })
              .catch((err)=>{
                cb(err);
              });
        });
      });

      parallel(jobs, (err, results)=>{
        if (err) {
          return callback(err);
        }
        // Filter out undefined - due to synced addresses
        const filtered = _.filter(results, function(x) {
          return (x===undefined ? false : true);
        });
        return callback(null, filtered);
      });
    } catch (err) {
      callback(err);
    }
  } catch (err) {
    callback(err);
  }
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
