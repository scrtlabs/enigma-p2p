const constants = require("../../../../common/constants");
const Envelop = require("../../../../main_controller/channels/Envelop");
const EncoderUtil = require("../../../../common/EncoderUtil");

class RouteRpcNonBlockingAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(requestEnvelop) {
    const targetTopic = requestEnvelop.content().request.workerAddress;
    const request = requestEnvelop.content().request;
    const type = requestEnvelop.content().type;

    // validate topic indicated
    if (!targetTopic || !request) {
      this._sendResponseEnvelope(
        requestEnvelop,
        { sent: false },
        "error no targetTopic/request"
      );
      return;
    }
    // encode routed msg
    const routedMessage = EncoderUtil.encode({
      type: type,
      request: request
    });
    if (!routedMessage) {
      this._sendResponseEnvelope(
        requestEnvelop,
        { sent: false },
        "error in encoding routed message"
      );
      return;
    }

    // send the request
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
      topic: targetTopic,
      message: routedMessage
    });
    // return jsonrpc response ack
    this._sendResponseEnvelope(requestEnvelop, { sent: true }, null);
  }

  _sendResponseEnvelope(requestEnvelop, result, error) {
    const env = new Envelop(
      requestEnvelop.id(),
      { result: result, error: error },
      requestEnvelop.type()
    );
    this._controller.communicator().send(env);
  }
}
module.exports = RouteRpcNonBlockingAction;
