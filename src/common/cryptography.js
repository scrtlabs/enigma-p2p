const Web3 = require('web3');
const web3 = new Web3();
const errors = require('./errors');
/**
 * hash parameters in order
 * @param {Array<Integer>} value of byte arrrays
 * @param {boolean} with0x optional defaults to true
 * @return {string} hash
 * */
module.exports.hash = (value, with0x = true)=>{
  let h = _keccack256Hash(value);
  if(!with0x && h.length > 2 && h.slice(0,2) === '0x'){
    h = h.substr(2);
  }
  return h;
};


/**
 * internal
 * */
const _keccack256Hash = (value)=>{
  return web3.utils.keccak256(Buffer.from(value));
};
