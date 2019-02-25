const MsgPrincipal = require('../../../policy/p2p_messages/principal_messages');
const constants = require('../../../common/constants');

class GetStateKeysAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const onPTTRequestResponse = async (err, coreResponse) => {
      if (err || coreResponse.type === 'Error') {
        this._controller.logger().error(`Failed Core connection: err: ${err}, coreResponse: ${JSON.stringify(coreResponse)}`);
        return;
      }
      const msg = MsgPrincipal.build({request: coreResponse.result.request, sig: coreResponse.result.workerSig});
      let principalResponse;
      try {
        principalResponse = await this._controller.principal().getStateKeys(msg);
      } catch (err) {
        // TODO: Errors.
        this._controller.logger().error(`Failed Principal node connection: ${err}`);
        return;
      }
      this._pttResponse({response: principalResponse.data, sig: principalResponse.sig}, (err, response) => {
        if (err || response.type === 'Error' || response.result.errors.length > 0) {
          // TODO: Errors.
          this._controller.logger().error(`Failed Core connection: err: ${err}, coreResponse: ${JSON.stringify(response)}`);
        }
      });
    };

    this._controller.execCmd(
        constants.NODE_NOTIFICATIONS.DB_REQUEST,
        {
          dbQueryType: constants.CORE_REQUESTS.GetPTTRequest,
          input: {addresses: params.addresses},
          onResponse: onPTTRequestResponse,
        },
    );
  }

  _pttResponse(params, cb) {
    this._controller.execCmd(
        constants.NODE_NOTIFICATIONS.DB_REQUEST,
        {
          dbQueryType: constants.CORE_REQUESTS.PTTResponse,
          input: {response: params.response},
          onResponse: cb,
        },
    );
  }
}

module.exports = GetStateKeysAction;
