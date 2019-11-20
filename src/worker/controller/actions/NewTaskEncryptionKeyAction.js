const constants = require("../../../common/constants");
const Envelop = require("../../../main_controller/channels/Envelop");
class NewTaskEncryptionKeyAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResponse = params.onResponse;
    const requestEnvelop = new Envelop(
      params.request.id,
      params.request,
      constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest
    );
    let err = null;
    if (!requestEnvelop.isValidEnvelop()) {
      err = "invalid envelop";
    }
    this._controller
      .communicator()
      .sendAndReceive(requestEnvelop)
      .then(responseEnvelop => {
        onResponse(err, responseEnvelop.content());
      });
  }
}
module.exports = NewTaskEncryptionKeyAction;
