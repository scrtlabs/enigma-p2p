const web3Utils = require('web3-utils');
const errors = require('./errors');
const BN = require('bignumber.js');
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
 * Convert any given value to BN.js instance for handling big numbers
 * @param {String/Number/HEX} value to convert to BN
 * @return {BN} converted value
 * */
module.exports.toBN = (value) => {
  return (new BN(value));
}

/**
 * internal
 * */
const _keccack256Hash = (value)=>{
  return web3Utils.keccak256(Buffer.from(value, 'hex'));
};
