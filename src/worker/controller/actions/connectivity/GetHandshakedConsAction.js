class GetHandshakedConsAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let result = {
      outbounds : [],
      intbounds : []
    };
    const currentPeerIds = this._controller.engNode().getAllPeersIds();
    const inHandshakedIds = this._controller.stats().getAllActiveInbound(currentPeerIds);
    const outHandshakedIds = this._controller.stats().getAllActiveOutbound(currentPeerIds);
    result.intbounds = this._controller.engNode().getPeersInfoList(inHandshakedIds);
    result.outbounds = this._controller.engNode().getPeersInfoList(outHandshakedIds);
    return result
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      let result = action.execute(params);
      res(result)
    });
  }
}
module.exports = GetHandshakedConsAction;

