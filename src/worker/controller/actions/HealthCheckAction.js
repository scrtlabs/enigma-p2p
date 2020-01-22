const constants = require("../../../common/constants");

class HealthCheckAction {
  constructor(controller) {
    this._controller = controller;
  }

  /**
   * @param {Function} callback (err)=>{}
   * */
  execute(params) {
    const callback = params.callback;
    const C = constants.NODE_NOTIFICATIONS;

    let healthCheckResult = {
      status: false,
      core: {
        status: false,
        registrationParams: {
          signKey: null
        }
      },
      ethereum: {
        status: false,
        uri: null,
        contract_addr: null
      },
      connectivity: {
        status: false,
        connections: null
      }
      // TODO: consider adding a periodic, once there
      /*state: {
        status: false,
        missing: null
      }*/
    };

    this._controller.execCmd(C.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams) => {
        if (!err) {
          // core
          healthCheckResult.core.registrationParams.signKey = regParams.result.signingKey;
          healthCheckResult.core.status = healthCheckResult.core.registrationParams.signKey != null;

          // ethereum
          if (this._controller.hasEthereum()) {
            try {
              let eth = await this._controller.ethereum().healthCheck();
              healthCheckResult.ethereum.uri = eth.url;
              healthCheckResult.ethereum.contract_addr = eth.enigmaContractAddress;
              healthCheckResult.ethereum.status = eth.isConnected;
            } catch (err) {
              healthCheckResult.ethereum.status = false;
            }
          }

          // connectivity
          healthCheckResult.connectivity.connections = this._controller.engNode().getConnectedPeers().length;
          healthCheckResult.connectivity.status = healthCheckResult.connectivity.connections >= 1;

          healthCheckResult.status =
            healthCheckResult.core.status && healthCheckResult.ethereum.status && healthCheckResult.connectivity.status; // && healthCheckResult.state.status;
          callback(null, healthCheckResult);
        }
      }
    });
  }

  asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.callback = function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      };
      action.execute(params);
    });
  }
}

module.exports = HealthCheckAction;
