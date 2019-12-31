const DbUtils = require("../common/DbUtils");

/**
 * Queries the Enigma contract and returns the comparison between the local tips and the consensus states
 * @param {EnigmaContractReaderAPI} api
 * @param {Array} localTips [{address,key,delta},...}]
 * @return {Promise} returning a JSON: missingList - missing states [{address, deltas : [deltaHash, index]}].
 *                                                  In case the entire contract is missing, the bytecodeHash is returned as well:
 *                                                  [{address, bytecodeHash , deltas : [deltaHash, index]}]
 *                                     excessList - excessive states [{address, remoteTip, localTip].
 *                                                  In case the entire contract is excessive, the remoteTip field is set to -1
 * */

async function compareLocalStateToRemote(api, localTips) {
  // create a hashmap from the localTips array
  return new Promise(async (resolve, reject) => {
    const tipsMap = localTips.reduce((obj, item) => {
      let address = item.address;
      if (typeof address !== "string") {
        address = DbUtils.toHexString(address);
      }
      obj[address] = item.key;
      return obj;
    }, {});

    let missingList = [];
    let excessList = [];

    try {
      const remoteSecretContractsAddresses = await api.getAllSecretContractAddresses();
      // First go over the remote secret contract tp compare state
      for (let secretContractAddress of remoteSecretContractsAddresses) {
        const contractData = await api.getContractParams(secretContractAddress);
        let missingAddress = false;
        let firstMissingIndex;
        let missingCodeHash;
        let missingDeltas = [];
        // get the local tip index, if exists; otherwise 0
        if (secretContractAddress in tipsMap) {
          firstMissingIndex = tipsMap[secretContractAddress] + 1;
          // we delete the secret contract from the tipsHash in order to check if there are excessive contracts locally (in the end of the loop)
          delete tipsMap[secretContractAddress];
        }
        // the address does not exist at the local db, set the firstMissingIndex to 0 and request the codehash
        else {
          firstMissingIndex = 0;
          missingAddress = true;
          missingCodeHash = contractData.codeHash;
        }
        // check if the local state has left over deltas
        if (firstMissingIndex > contractData.deltaHashes.length) {
          excessList.push({
            address: secretContractAddress,
            remoteTip: contractData.deltaHashes.length - 1,
            localTip: firstMissingIndex - 1
          });
        }
        for (let i = firstMissingIndex; i < contractData.deltaHashes.length; i++) {
          missingDeltas.push({
            deltaHash: contractData.deltaHashes[i],
            index: i
          });
        }
        if (missingDeltas.length) {
          if (missingAddress === true) {
            missingList.push({
              address: secretContractAddress,
              deltas: missingDeltas,
              bytecodeHash: missingCodeHash
            });
          } else {
            missingList.push({
              address: secretContractAddress,
              deltas: missingDeltas
            });
          }
        }
      }
      // Now check that there are no excessive contracts locally
      for (let secretContractAddress of Object.keys(tipsMap)) {
        excessList.push({ address: secretContractAddress, remoteTip: -1, localTip: tipsMap[secretContractAddress] });
      }
    } catch (err) {
      return reject(err);
    }
    resolve({ missingList, excessList });
  });
}

module.exports = { compareLocalStateToRemote: compareLocalStateToRemote };
