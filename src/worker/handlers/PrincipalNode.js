const jayson = require('jayson');
const MsgPrincipal = require('../../policy/p2p_messages/principal_messages');
const PRINCIPAL_CONSTANTS = require('../../common/constants').PRINCIPAL_NODE;

class PrincipalNode {
  constructor(config, logger) {
    if (config && config.uri) {
      this._uri = config.uri;
    } else {
      this._uri = PRINCIPAL_CONSTANTS.uri;
    }

    this._logger = logger;
    this._client = jayson.client.http(this._uri);
    // this._logger.debug('Connected to principal node: ' + this._uri);
  }

  async getStateKeys(msg) {
    return new Promise((resolve, reject) => {
      if (!(msg instanceof MsgPrincipal)) {
        // TODO: Changed to type error from common/errors.
        reject(new Error('getStateKeys accepts only object of type MsgPrincipal'));
      }

      const msgObj = {
        'requestMessage': msg.getRequest(),
        'workerSig': msg.getSig(),
      };
      this._client.request('getStateKeys', msgObj, (err, response) => {
        if (err) return reject(err);
        if (response.error) return reject(response.error);
        resolve(response.result.encryptedResponseMessage);
      });
    });
  }
}

module.exports = PrincipalNode;
