/**
 * performed by the gateway side.
 * this action dispatches
 * */

const constants = require("../../../../common/constants");
const utils = require("../../../../common/utils");
const Envelop = require("../../../../main_controller/channels/Envelop");

class ProxyDispatcherAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(requestEnvelop) {
    const type = requestEnvelop.content().type;
    let theAction = null;
    switch (type) {
      case constants.CORE_REQUESTS.NewTaskEncryptionKey:
        theAction = constants.NODE_NOTIFICATIONS.ROUTE_BLOCKING_RPC;
        const workerSignKey = requestEnvelop.content().workerSignKey;
        const sequence = requestEnvelop.content().id;
        const selfId = this._controller.engNode().getSelfIdB58Str();
        requestEnvelop.content().targetTopic = selfId + workerSignKey + sequence;
        break;
      case constants.NODE_NOTIFICATIONS.GET_TASK_STATUS:
        theAction = constants.NODE_NOTIFICATIONS.DISPATCH_STATUS_REQ_RPC;
        const taskId = requestEnvelop.content().taskId;
        const workerAddr = requestEnvelop.content().workerAddress;
        requestEnvelop.content().targetTopic = taskId + workerAddr;
        requestEnvelop.content().workerSignKey = workerAddr;
        if (!requestEnvelop.content().id) {
          requestEnvelop.content().id = taskId;
        }
        break;
      case constants.CORE_REQUESTS.DeploySecretContract:
        try {
          // translate from base64 to byte array
          const preCodeBufferGzip = Buffer.from(requestEnvelop.content().request.preCode, "base64");
          // unzip the preCode
          const preCodeBuffer = await utils.gunzip(preCodeBufferGzip);
          const preCodeByteArray = [...preCodeBuffer];
          requestEnvelop.content().request.preCode = preCodeByteArray;
        } catch (e) {
          this._controller
            .logger()
            .info(`[PROXY_DISPATCH] an exception occurred while trying to unpack DeploySecretContract RPC ${e}`);
          return;
        }
      case constants.CORE_REQUESTS.ComputeTask:
        theAction = constants.NODE_NOTIFICATIONS.ROUTE_NON_BLOCK_RPC;
        break;
      case constants.NODE_NOTIFICATIONS.GET_TASK_RESULT:
        this._getTaskResult(type, requestEnvelop);
        break;
    }
    if (theAction) {
      this._controller.logger().debug("[PROXY_DISPATCH] sending dispatched rpc request");
      this._controller.execCmd(theAction, requestEnvelop);
    }
  }
  async _getTaskResult(type, requestEnvelop) {
    let result = null;
    try {
      result = await this._controller.asyncExecCmd(type, {
        taskId: requestEnvelop.content().taskId
      });
      result = JSON.parse(result.toDbJson());
    } catch (e) {
      this._controller.logger().info(`[PROXY_DISPATCH] error getting result ${e}`);
    } finally {
      const responseEnvelop = new Envelop(requestEnvelop.id(), { result: result }, requestEnvelop.type());
      this._controller.communicator().send(responseEnvelop);
    }
  }
}
module.exports = ProxyDispatcherAction;
