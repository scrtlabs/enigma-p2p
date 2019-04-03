class MsgPrincipal {
  constructor(request, sig) {
    this._request = request;
    this._sig = sig;
    Object.freeze(this);
  }

  static build(jsonObj) {
    if (jsonObj && jsonObj.request && jsonObj.sig) {
      return new MsgPrincipal(jsonObj.request, jsonObj.sig);
    } else {
      return null;
    }
  }

  getRequest() {
    return this._request;
  }

  getSig() {
    return this._sig;
  }

  toJson() {
    return [this.getRequest(),this.getSig()];
  }
}

module.exports = MsgPrincipal;
