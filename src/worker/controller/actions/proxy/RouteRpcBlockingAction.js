const constants = require("../../../../common/constants");
const EncoderUtil = require("../../../../common/EncoderUtil");
const Envelop = require("../../../../main_controller/channels/Envelop");

class RouteRpcBlockingAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * expects a targetTopic and id in the envelop.content()
   * targetTopic : the result topic will be published to
   * workerSignKey : the target topic for the request
   * */
  execute(requestEnvelop) {
    const request = requestEnvelop.content();
    const sequence = requestEnvelop.content().id;
    const targetTopic = requestEnvelop.content().targetTopic;
    const workerSignKey = requestEnvelop.content().workerSignKey;
    const reqType = requestEnvelop.content().type;

    if (!targetTopic || !sequence || !workerSignKey) {
      this._sendResponseEnvelope(
        requestEnvelop,
        false,
        "error no sequence/targetTopic/signKey"
      );
      return;
    }

    const routedMessage = EncoderUtil.encode({
      type: reqType,
      request: request,
      sequence: sequence,
      targetTopic: targetTopic
    });
    if (!routedMessage) {
      this._sendResponseEnvelope(
        requestEnvelop,
        false,
        "error in encoding routed message"
      );
      return;
    }

    // onPublish callback
    const onPublish = msg => {
      // once the result from the worker arrives
      const data = EncoderUtil.decode(msg.data);
      if (!data) {
        this._sendResponseEnvelope(
          requestEnvelop,
          false,
          "error in decoding response message"
        );
      } else {
        this._sendResponseEnvelope(requestEnvelop, data.result, null);
      }
      // TODO:: possible unsubscribe depends what the reqs are it might not be default maybe reuse the topic
    };
    // onSubscribed callback
    const onSubscribed = () => {
      console.log("[rpc] subscribed to target topic = " + targetTopic);
      // publish the actual request
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
        topic: workerSignKey,
        message: routedMessage
      });
    };

    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_SUB, {
      topic: targetTopic,
      onPublish: onPublish,
      onSubscribed: onSubscribed
    });
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
module.exports = RouteRpcBlockingAction;
