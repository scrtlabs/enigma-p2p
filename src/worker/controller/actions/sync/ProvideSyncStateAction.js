class ProvideSyncStateAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const provider = this._controller.provider();
    const connectionStream = params.params.connection;
    provider.startStateSyncResponse(connectionStream);
  }
}
module.exports = ProvideSyncStateAction;
