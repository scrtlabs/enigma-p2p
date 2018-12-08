const constants = require('../../../common/constants');
const Envelop = require('../../../main_controller/channels/Envelop');
class NewTaskEncryptionKeyAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    let onResponse = params.onResponse;
    let requestEnvelop = new Envelop(true,
        {type : constants.CORE_REQUESTS.NewTaskEncryptionKey},
        constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest);

    this._controller.communicator()
    .sendAndReceive(requestEnvelop)
    .then(responseEnvelop=>{
      onResponse(null,responseEnvelop.content());
    });
  }
}
module.exports = NewTaskEncryptionKeyAction;
