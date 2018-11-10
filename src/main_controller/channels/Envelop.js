const nodeUtils = require('../../common/utils');

class Envelop {

  constructor(sequenceOrId, obj, msgType) {
    //TODO:: this does not actually THROW it just hangs in there without any signal
    if (!sequenceOrId || !obj || !msgType) {
      throw new Error('sequenceOrId,obj,msgType must be specified!');
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
