const nodeUtils = require('../../common/utils');

class Envelop {

  /** @param {Boolean/string} sequenceOrId
   *  -- if sequenceOrId is True generate new random id, if sequenceOrId is a string=> it is already id. (hence the name ;-) )
   *  @param {Object} obj, the data being passed
   *  @param {string} msgType , used by the MainController to identify which runtime should be called */
  constructor(sequenceOrId, obj, msgType) {
    //TODO:: this does not actually THROW it just hangs in there without any signal
    if (!sequenceOrId || !obj || !msgType) {
      console.log("[-] error initializing envelop sequenceOrId,obj,msgType must be specified!");
    }
    this._msgType = msgType;
    this._obj = obj;
    this._id = false;
    // for response envelop we reuse the id from the original request
    if (sequenceOrId && nodeUtils.isString(sequenceOrId)) {
      this._id = sequenceOrId;
    } else if (sequenceOrId === true) { // initialize a request with id for response
      this._id = nodeUtils.randId();
    }

    // attach id to msg if missing
    if(!('id' in this._obj) && this._id !== false){
      this._obj.id = this._id;
    }
  }
  type() {
    return this._msgType;
  }
  id() {
    return this._id;
  }
  content() {
    return this._obj;
  }
}

module.exports = Envelop;
