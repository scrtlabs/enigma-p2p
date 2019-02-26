const MsgPrincipal = require('../../../policy/p2p_messages/principal_messages');
const constants = require('../../../common/constants');

class GetStateKeysAction {
  constructor(controller) {
    this._controller = controller;
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.onResponse = function(err, data) {
        if (err) reject(err);
        else resolve(data);
      };
      action.execute(params);
    });
  }

  execute(params) {
    let onResponse = params.onResponse;
    if (!onResponse) {
      onResponse = () => {};
    }
    const onPTTRequestResponse = async (err, coreResponse) => {
      if (err || coreResponse.type === 'Error') {
        if (coreResponse && coreResponse.type === 'Error') {
          err = coreResponse.msg;
        }
        this._controller.logger().error(`Failed Core connection: err: ${err}, coreResponse: ${JSON.stringify(coreResponse)}`);
        return onResponse(err, null);
      }
      const msg = MsgPrincipal.build({request: coreResponse.result.request, sig: coreResponse.result.workerSig});
      let principalResponse;
      try {
        principalResponse = await this._controller.principal().getStateKeys(msg);
      } catch (err) {
        // TODO: Errors.
        this._controller.logger().error(`Failed Principal node connection: ${err.code} - ${err.message}`);
        return onResponse(err, null);
      }
      let ppalResponse = JSON.parse(principalResponse);
      console.log(ppalResponse);
      this._pttResponse({response: ppalResponse.data, sig: principalResponse.sig}, (err, response) => {
        if (err || response.type === 'Error' || response.result.errors.length > 0) {
          if (response && coreResponse.type === 'Error') {
            err = coreResponse.msg;
          } else if (response && response.result && response.result.errors.length > 0) {
            err = response.result;
          }
          this._controller.logger().error(`Failed Core connection: err: ${err}, coreResponse: ${JSON.stringify(response)}`);
          return onResponse(err, null);
        }
        console.log(response);
        return onResponse(null, null);
      });
    };

    this._controller.execCmd(
        constants.NODE_NOTIFICATIONS.DB_REQUEST,
        {
          dbQueryType: constants.CORE_REQUESTS.GetPTTRequest,
          input: params.addresses,
          onResponse: onPTTRequestResponse,
        },
    );
  }

  _pttResponse(params, cb) {
    console.log('Passing this to core');
    console.log(params.response.data);
    this._controller.execCmd(
        constants.NODE_NOTIFICATIONS.DB_REQUEST,
        {
          dbQueryType: constants.CORE_REQUESTS.PTTResponse,
          input: {response: params.response.data},
          onResponse: cb,
        },
    );
  }
}

module.exports = GetStateKeysAction;
