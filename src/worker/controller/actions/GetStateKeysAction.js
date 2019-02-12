const PrincipalNode = require('../../PrincipalNode');
const MsgPrincipal = require('../../../policy/p2p_messages/principal_messages');
const constants = require('../../../common/constants');

class GetStateKeysAction {
  constructor(controller) {
    this._controller = controller;
    this._principal = new PrincipalNode();
  }

  execute(params) {
    const onPTTRequestResponse = async (err, coreResponse) => {
      if (err) {
        this._controller.logger().error(`Failed Core connection: ${err}`);
        return;
      }

      const msg = MsgPrincipal.build({request: coreResponse.result.request, sig: coreResponse.result.workerSig});
      let principalResponse;
      try {
        principalResponse = await this._principal.getStateKeys(msg);
      } catch (err) {
        // TODO: Errors.
        this._controller.logger().error(`Failed Principal node connection: ${err}`);
        return;
      }
      this._pttResponse({response: principalResponse}, (err, response) => {
        if (err || response.errors.len() > 0) {
          // TODO: Errors.
          this._controller.logger().error(`Failed Core connection: ${err}, \n ${response}`);
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
