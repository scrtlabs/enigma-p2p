const constants = require("../../../../common/constants");
const errs = require("../../../../common/errors");
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require("../../../../main_controller/channels/Envelop");

class DbRequestAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    const onResponse = params.onResponse;
    const queryType = params.dbQueryType;
    const input = params.input;
    if (!this._validateRequest(queryType)) {
      onResponse(new errs.TypeErr(`"invalid queryType ${queryType}`));
      return;
    }
    const requestEnvelop = new Envelop(
      true,
      { type: queryType, input: input },
      constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest
    );
    this._controller
      .communicator()
      .sendAndReceive(requestEnvelop)
      .then(responseEnvelop => {
        const parsedResponse = responseEnvelop.content();
        onResponse(parsedResponse.error, parsedResponse);
      });
  }
  _validateRequest(reqType) {
    return reqType in constants.CORE_REQUESTS;
  }
}
module.exports = DbRequestAction;
