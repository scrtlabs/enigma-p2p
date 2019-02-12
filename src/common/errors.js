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

class InitPipelinesErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}
class P2PErr extends Error {
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class EthereumErr extends Error {
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}
module.exports.SyncReceiverErr = SyncReceiverErr;
module.exports.TypeErr = TypeErr;
module.exports.InitPipelinesErr = InitPipelinesErr;
module.exports.P2PErr = P2PErr;
module.exports.EthereumErr = EthereumErr;
