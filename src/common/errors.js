/*
 * TODO:: Add errors! (if i forget before main net i owe 1 ether to elichai)
 */

class MissingFieldsErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class InputErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class SyncReceiverErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class SyncReceiverNoMissingDataErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class TypeErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class InitPipelinesErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}
class P2PErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class EthereumErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class ActionNameErr extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}
class TaskFailedErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class TaskValidityErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class TaskVerificationErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class WorkerSelectionVerificationErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class TaskTimeoutErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class TaskCancelledErr extends Error{
  constructor(message){
    super(message);
    Error.captureStackTrace(this,this.constructor);
    this.name = this.constructor.name;
  }
}

class EnigmaContractDataError extends Error{
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
module.exports.ActionNameErr = ActionNameErr;
module.exports.TaskFailedErr = TaskFailedErr;
module.exports.TaskValidityErr = TaskValidityErr;
module.exports.TaskVerificationErr = TaskVerificationErr;
module.exports.WorkerSelectionVerificationErr = WorkerSelectionVerificationErr;
module.exports.EnigmaContractDataError = EnigmaContractDataError;
module.exports.MissingFieldsErr = MissingFieldsErr;
module.exports.SyncReceiverNoMissingDataErr = SyncReceiverNoMissingDataErr;
module.exports.InputErr = InputErr;
module.exports.TaskTimeoutErr = TaskTimeoutErr;
module.exports.TaskCancelledErr = TaskCancelledErr;
