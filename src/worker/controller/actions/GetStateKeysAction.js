const MsgPrincipal = require('../../../policy/p2p_messages/principal_messages');
const constants = require('../../../common/constants');

class GetStateKeysAction {
  constructor(controller) {
    this._controller = controller;
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      if (!params) {
        params = {};
      }
      params.onResponse = function(err, data) {
        if (err) reject(err);
        else resolve(data);
      };
      action.execute(params);
    });
  }

  execute(params) {
    let onResponse;
    if (params && params.onResponse) {
      onResponse = params.onResponse;
    } else {
      onResponse = () => {};
    }

    // First, set PTT flag (and validate that no PTT is in progress now)
    if (!this._controller.principal().startPTT()) {
      const err = 'PTT in progress.. aborting GetStateKeysAction';
      this._controller.logger().error(err);
      return onResponse(err);
    }

    const onPTTRequestResponse = async (err, coreResponse) => {
      if (err || coreResponse.type === 'Error') {
        if (coreResponse && coreResponse.type === 'Error') {
          err = coreResponse.msg;
        }
        return this._handleError(`Failed Core connection: err: ${JSON.stringify(err)}, coreResponse: ${JSON.stringify(coreResponse)}`,
          err, onResponse);
      }

      let principalResponse;
      try {
        principalResponse = await this._controller.principal().getStateKeys(this._buildRequestMsg(coreResponse, params));
      }
      catch (err) {
        // TODO: Errors.
        return this._handleError(`Failed Principal node connection: ${err.code} - ${err.message}`,
          err, onResponse);
      }
      this._pttResponse({response: principalResponse.data, sig: principalResponse.sig}, (err, response) => {
        if (err || response.type === 'Error' || response.result.errors.length > 0) {
          if (response && coreResponse.type === 'Error') {
            err = coreResponse.msg;
          } else if (response && response.result && response.result.errors.length > 0) {
            err = response.result;
          }
          return this._handleError(`Failed Core connection: err: ${JSON.stringify(err)}, coreResponse: ${JSON.stringify(response)}`,
            err, onResponse);
        }
        this._controller.principal().onPTTEnd();
        return onResponse(null);
      });
    };

    let dbRequestParams =  {
      dbQueryType: constants.CORE_REQUESTS.GetPTTRequest,
      onResponse: onPTTRequestResponse,
    };

    this._controller.execCmd(constants.NODE_NOTIFICATIONS.DB_REQUEST, dbRequestParams);
  }

  _pttResponse(params, cb) {
    this._controller.execCmd(
      constants.NODE_NOTIFICATIONS.DB_REQUEST,
      {
        dbQueryType: constants.CORE_REQUESTS.PTTResponse,
        input: params,
        onResponse: cb,
      },
    );
  }

  _buildRequestMsg(coreResponse, params) {
    let msg = {
      request: coreResponse.result.request,
      sig: coreResponse.result.workerSig
    };
    if (params) {
      if (params.addresses) {
        msg.addresses = params.addresses;
      }
      if (params.blockNumber) {
        msg.blockNumber = params.blockNumber;
      }
    }
    return MsgPrincipal.build(msg);
  }

  _handleError(errMsg, err, onResponse) {
    this._controller.logger().error(errMsg);
    this._controller.principal().onPTTEnd();
    onResponse(err);
  }
}

module.exports = GetStateKeysAction;
