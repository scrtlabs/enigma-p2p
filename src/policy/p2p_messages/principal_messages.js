class MsgPrincipal {
  constructor(request, sig) {
    this._request = request;
    this._sig = sig;
    Object.freeze(this);
  }

  static build(jsonObj) {
    if (jsonObj.request && jsonObj.sig) {
      return new MsgPrincipal(jsonObj.request, jsonObj.sig);
    } else {
      throw new Error('Must provide request in the json');
    }
  }

  getRequest() {
    return this._request;
  }

  getSig() {
    return this._sig;
  }
}

module.exports = MsgPrincipal;
