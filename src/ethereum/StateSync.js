const parallel = require('async/parallel');
const DbUtils = require('../common/DbUtils');

/**
 * Queries the Enigma contract and returns the missing states in comparison to the local tips
 * @param {EnigmaContractReaderAPI} api
 * @param {Array} localTips [{address,key,delta},...}]
 * @param {Function} callback (err, results)=>{}
 * @return {Array} missing states [{address, deltas : [deltaHash, index]}].
 *                 In case the entire contract is missing, the bytecodeHash is returned as well:
 *                 [{address, bytecodeHash , deltas : [deltaHash, index]}]
 * TODO: as async function returns a Promise, apply both options: return the data using the callback
 * and return the data using the promise
 * */
async function getRemoteMissingStates(api, localTips, logger, callback) {
  // create a hashmap from the localTips array
  const tipsHashMaps = localTips.reduce((obj, item) => {
    let address = item.address;
    if (typeof address !== 'string') {
      address = DbUtils.toHexString(address);
    }
    // add '0x' to be able to compare the addresses with Ethereum
    if (address.slice(0, 2) != '0x') {
      address = '0x' + address;
    }
    obj[address] = item.key;
    return obj;
  }, {});


  try {
    const remoteSecretContractNumber = await api.countSecretContracts();
    const remoteSecretContractsAddresses = await api.getSecretContractAddresses(0, remoteSecretContractNumber);
    // console.log("remoteSecretContractNumber=", remoteSecretContractNumber);
    // console.log("remoteSecretContractsAddresses=", remoteSecretContractsAddresses);
    // initiate jobs
    const jobs = [];
    remoteSecretContractsAddresses.forEach((secretContractAddress)=>{
      jobs.push((cb)=>{
        api.getContractParams(secretContractAddress)
        //api.countStateDeltas(secretContractAddress)
            .then(async (contractData)=>{
              //console.log("secretContractAddress=", secretContractAddress);
              //console.log("contractData=", contractData);
              let missingAddress = false;
              let firstMissingIndex;
              let missingCodeHash;
              // get the local tip index, if exists; otherwise 0
              if (secretContractAddress in tipsHashMaps) {
                firstMissingIndex = tipsHashMaps[secretContractAddress] + 1;
                if (contractData.deltaHashes.length === firstMissingIndex) {
                  console.log("1");
                  return cb(null);
                }
              }
              // the address does not exist at the local db, set the firstMissingIndex to 0 and request the codehash
              else {
                firstMissingIndex = 0;
                missingAddress = true;
                missingCodeHash = contractData.codeHash;
              }
              const parsedDeltasArray = [];
              for (let i = firstMissingIndex; i < contractData.deltaHashes.length; i++) {
                parsedDeltasArray.push({deltaHash: contractData.deltaHashes[i], index: i});
              }
              if (missingAddress === true) {
                console.log("2");
                return cb(null, {address: secretContractAddress, deltas: parsedDeltasArray,
                  bytecodeHash: missingCodeHash});
              }
              console.log("3");
              return cb(null, {address: secretContractAddress, deltas: parsedDeltasArray});
            })
            .catch((err)=>{
              logger.error('error received while trying to read data from Ethereum: ', err);
              console.log("4");
              return cb(err);
            });
      });
    });

    parallel(jobs, (err, results)=>{
      if (err) {
        logger.error('error received while trying to read data from Ethereum: ', err);
        console.log("ended - 1")
        return callback(err);
      }
      // 1. Filter out undefined - due to synced addresses
      // 2. Remove the '0x' from the secret contract addresses
      const filtered = [];
      results.forEach((result)=>{
        if (result !== undefined) {
          result.address = result.address.slice(2, result.address.length);
          filtered.push(result);
        }
      });
      console.log("ended - 2");
      return callback(null, filtered);
    });
  } catch (err) {
    logger.error('error received while trying to read data from Ethereum: ', err);
    console.log("ended - 3");
    return callback(err);
  }
}

module.exports = {getRemoteMissingStates: getRemoteMissingStates};
