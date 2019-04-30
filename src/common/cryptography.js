const web3Utils = require('web3-utils');
const errors = require('./errors');
const JSBI = require('jsbi');
const utils = require('../common/utils');

/**
 * hash parameters in order
 * @param {Array<Integer>} value of byte arrrays
 * @param {boolean} with0x optional defaults to true
 * @return {string} hash
 * */
module.exports.hash = (value, with0x = true)=>{
  let h = _keccack256Hash(value);
  if (!with0x && h.length > 2 && h.slice(0, 2) === '0x') {
    h = h.substr(2);
  }
  return h;
};

/**
 * Hash parameters in order, mimicking the way solidity is doing that
 * The function receives any number of parameters
 * @return {string} hash
 * */
module.exports.soliditySha3 = function () {
  return web3Utils.soliditySha3.apply(null, arguments);
}

/**
 * Convert any given value to JSBI instance for handling big numbers
 * @param {String/Number/HEX} value to convert to BigNumber
 * @return {JSBI} converted value
 * */
module.exports.toBN = (value) => {
  return JSBI.BigInt(value);
}


/**
 * Generate a hash of all inputs
 * The Enigma contract uses the same logic to generate a matching taskId
 *
 * @param {array} inputsArray
 * @return {string} hash of inputs
 */
module.exports.hashArray = (inputsArray) => {
  let hexStr = '';
  for (let e of inputsArray) {
    e = utils.remove0x(e);
    // since the inputs are in hex string, they are twice as long as their bytes
    hexStr += JSBI.BigInt(e.length/2).toString(16).padStart(16, '0') + e;
  }
  return web3Utils.soliditySha3({t: 'bytes', v: hexStr});
}

/**
 * internal
 * */
const _keccack256Hash = (value)=>{
  return web3Utils.keccak256(Buffer.from(value, 'hex'));
};
