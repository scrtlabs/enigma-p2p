const Web3 = require('web3');
const errors = require('./errors');
/**
 * hash parameters in order
 * */
module.exports.hashOrderd = (parameter1, ...restArgs)=>{

};

module.exports.hashBuffer = (buffer)=>{
  return _hash(buffer);
};
function _hash(buffer){
  if(buffer instanceof Buffer){
    return new Web3().utils.sha3(buffer);
  }
  throw new errors.TypeErr("Error hashing type " + typeof(buffer) + " must be of type Buffer");
}

// _hash(Buffer.from([1,2,2,3]));
