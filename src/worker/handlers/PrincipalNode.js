const jayson = require('jayson');
const retry = require('retry');
const EventEmitter = require('events').EventEmitter;

const constants = require('../../common/constants');
const MsgPrincipal = require('../../policy/p2p_messages/principal_messages');
const PRINCIPAL_CONSTANTS = constants.PRINCIPAL_NODE;


class PrincipalNode extends EventEmitter {
  constructor(config, logger) {
    super();

    if (config && config.uri) {
      this._uri = config.uri;
    } else {
      this._uri = PRINCIPAL_CONSTANTS.uri;
    }

    this._logger = logger;
    this._client = jayson.client.http(this._uri);
    this._pttInProgress = false;
  }

  startPTT() {
    if (this._pttInProgress) {
      this._logger.error("PTT is already in progress, cannot initiate a new one");
      return false;
    }
    this._pttInProgress = true;
    return true;
  }

  onPTTEnd() {
    this._pttInProgress = false;
    this.emit(constants.PTT_END_EVENT);
  }

  isInPTT() {
    return this._pttInProgress;
  }

  async getStateKeys(msg) {
    return new Promise((resolve, reject) => {
      if (!(msg instanceof MsgPrincipal)) {
        // TODO: Changed to type error from common/errors.
        reject(new Error('getStateKeys accepts only object of type MsgPrincipal'));
      }

      // TODO: adjust config params and not use defaults
      let operation = retry.operation(PRINCIPAL_CONSTANTS.retryOptions);
      operation.attempt((currentAttempt)=> {
        this._client.request('getStateKeys', msg.toJson(), (err, response) => {
          if (this._logger) {
            this._logger.debug('Connecting to principal node: ' + this._uri);
          }
          // Check if there was an error and the operation can be retried
          if ((err || (response.error && response.error.code && response.error.code === PRINCIPAL_CONSTANTS.EPOCH_STATE_TRANSITION_ERROR_CODE))
            && operation.retry(true))
          {
            this._logger.debug('Error received from KM, will retry..');
            return;
          }

          // Check if there was an error (after the retries have done) and reject
          if (err) return reject(err);

          // Check the response and reject/resolve accordingly
          if (response.error) return reject(response.error);
          resolve(response.result);
        });
      })

    });
  }
}

module.exports = PrincipalNode;
