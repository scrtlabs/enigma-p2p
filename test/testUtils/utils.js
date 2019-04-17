var rimraf = require('rimraf');
const randomize = require('randomatic');
const DB_PROVIDER = require('../../src/core/core_server_mock/data/provider_db');
const DbUtils = require('../../src/common/DbUtils');
const crypto = require('../../src/common/cryptography');

/**
 * Generate variable size random string from Aa0
 * @param {Integer} size
 * @return {string} result
 * */
module.exports.randLenStr = function(size) {
  return randomize('Aa0', size);
};
/**
 * generate random integer with max
 * @param {Integer} max
 */
module.exports.getRandomInt = function(max) {
  return _randomInt(max);
};

function _randomInt(max){
  return Math.floor(Math.random() * Math.floor(max));
}

module.exports.getRandomByteArray = function(size){
  let output = [];
  for(let i=0;i<size;++i){
    output.push(_randomInt(256));
  }
  return output;
};

module.exports.sleep = function(ms) {
    return _sleep(ms);
};

function _sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.rm_Minus_Rf = async (path)=>{
  return new Promise((resolve,reject)=>{
    _deleteFolderFromOSRecursive(path,(err)=>{
      if(err) reject(err);
      else resolve();
    });
  });
};

module.exports.deleteFolderFromOSRecursive = function(path, callback){
  _deleteFolderFromOSRecursive(path,callback);
};

module.exports.transformStatesListToMap = (statesList) =>  {
  const statesMap = {};
  for (let i = 0; i < statesList.length; ++i) {
    const address = statesList[i].address;
    if (!(address in statesMap)) {
      statesMap[address] = {};
    }
    const key = statesList[i].key;
    const delta = statesList[i].data;
    statesMap[address][key] = delta;
  }
  return statesMap;
};

module.exports.PROVIDERS_DB_MAP = this.transformStatesListToMap(DB_PROVIDER);

// add the whole DB_PROVIDER as a state in ethereum. ethereum must be running for this worker
module.exports.setEthereumState = async (api, web3, workerAddress, workerEnclaveSigningAddress) => {
  for (const address in this.PROVIDERS_DB_MAP) {
    const secretContractData = this.PROVIDERS_DB_MAP[address];
    const addressInByteArray = address.split(',').map(function(item) {
      return parseInt(item, 10);
    });

    const hexString = '0x' + DbUtils.toHexString(addressInByteArray);
    const codeHash = crypto.hash(secretContractData[-1]);
    const firstDeltaHash = crypto.hash(secretContractData[0]);
    const outputHash = web3.utils.randomHex(32);
    const gasUsed = 5;
    const optionalEthereumData = '0x00';
    const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';
    await api.deploySecretContract(hexString, codeHash, codeHash, firstDeltaHash, optionalEthereumData,
      optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

    let i = 1;

    while (i in secretContractData) {
      const taskId = web3.utils.randomHex(32);
      const delta = secretContractData[i];
      const stateDeltaHash = crypto.hash(delta);
      await api.commitReceipt(hexString, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
        workerEnclaveSigningAddress, {from: workerAddress});
      i++;
    }
  }
};

/**
 * same as rm -rf <some folder>
 *   @param {string} path
 *   @param {function} callback
 */
function _deleteFolderFromOSRecursive(path, callback){rimraf(path, callback);}
