/*
 * TODO:: Add errors! (if i forget before main net i owe 1 ether to elichai)
 */
class SyncReceiverErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class TypeErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

module.exports.SyncReceiverErr = SyncReceiverErr;
module.exports.TypeErr = TypeErr;


