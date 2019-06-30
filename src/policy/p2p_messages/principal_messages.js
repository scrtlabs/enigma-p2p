class MsgPrincipal {
  constructor(request, sig, addresses, blockNumber) {
    this._request = request;
    this._sig = sig;
    this._blockNumber = blockNumber;
    this._addresses = addresses;
    Object.freeze(this);
  }

  static build(jsonObj) {
    if (jsonObj && jsonObj.request && jsonObj.sig) {
      const blockNumber = (jsonObj.blockNumber) ? jsonObj.blockNumber : null;
      const addresses = (jsonObj.addresses) ? jsonObj.addresses : null;
      return new MsgPrincipal(jsonObj.request, jsonObj.sig, addresses, blockNumber);
    }
    else {
      return null;
    }
  }

  getRequest() {
    return this._request;
  }

  getSig() {
    return this._sig;
  }

  getBlockNumber() {
    return this._blockNumber;
  }

  getAddresses() {
    return this._addresses;
  }

  toJson() {
    let dict = {
      'data': this._request,
      'sig': this._sig
    };
    if (this._addresses) {
      dict.addresses = this._addresses;
    }
    if (this._blockNumber) {
      dict.blockNumber = this._blockNumber;
    }
    return dict;
  }
}

module.exports = MsgPrincipal;
