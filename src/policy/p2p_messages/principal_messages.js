class MsgPrincipal { 
  constructor(request) {
    this._request = request;
    Object.freeze(this);
  }

  static build(jsonObj) {
    if(jsonObj.request) 
      return new MsgPrincipal(jsonObj.request)
    else
      throw new Error('Must provide request in the json');
  }

  getRequest() { return this._request; }

}

module.exports = MsgPrincipal;