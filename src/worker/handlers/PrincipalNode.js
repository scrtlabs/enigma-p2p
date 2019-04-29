const jayson = require('jayson');
const MsgPrincipal = require('../../policy/p2p_messages/principal_messages');
const PRINCIPAL_CONSTANTS = require('../../common/constants').PRINCIPAL_NODE;
const retry = require('retry');

class PrincipalNode {
  constructor(config, logger) {
    if (config && config.uri) {
      this._uri = config.uri;
    } else {
      this._uri = PRINCIPAL_CONSTANTS.uri;
    }

    this._logger = logger;
    this._client = jayson.client.http(this._uri);
  }

  async getStateKeys(msg) {
    return new Promise((resolve, reject) => {
      if (!(msg instanceof MsgPrincipal)) {
        // TODO: Changed to type error from common/errors.
        reject(new Error('getStateKeys accepts only object of type MsgPrincipal'));
      }

      // TODO: adjust config params and not use defaults
      let operation = retry.operation();
      operation.attempt((currentAttempt)=> {
        this._client.request('getStateKeys', msg.toJson(), (err, response) => {
          if (this._logger) {
            this._logger.debug('Connecting to principal node: ' + this._uri);
          }
          // Check if there was an error and the operation can be retried
          if (err && operation.retry(err)) return;

          // Check if there was an error (after the retries have done) and reject
          if (err) return reject(response.error);

          // Check the response and reject/resolve accordingly
          if (response.error) return reject(response.error);
          resolve(response.result);
        });

      })

    });
  }
}

module.exports = PrincipalNode;
