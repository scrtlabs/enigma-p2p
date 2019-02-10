const jayson = require('jayson');
const MsgPrincipal = require('../policy/p2p_messages/principal_messages');

class PrincipalNode {
  constructor(config, logger) {
    if (config.uri)
      this._uri = config.uri;
    else
      throw new Error('Must pass uri to PincipalNode');

    this._logger = logger;
    this._client = jayson.client.http(this._uri);
    // this._logger.debug('Connected to principal node: ' + this._uri);
  }

  async getStateKeys(msg) {
    if (!(msg instanceof MsgPrincipal)) {
      throw new Error('getStateKeys accepts only object of type MsgPrincipal')
    }

    return new Promise( (resolve, reject) => {
      this._client.request('getStateKeys', {'requestMessage': msg.getRequest()}, (err, response) => {
        if (err) return reject(err);
        if (response.error) return reject(response.error);
        resolve(response.result.encryptedResponseMessage);
      });
    });
  }
}

module.exports = PrincipalNode;