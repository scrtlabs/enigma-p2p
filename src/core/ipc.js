const nodeUtils = require('../common/utils');
const zmq = require('zeromq');
const EventEmitter = require('events').EventEmitter;
const Logger = require('../common/logger');
const SCHEMES = require('./core_messages_scheme');
const validate = require('jsonschema').validate;
const errors = require('../common/errors');


class IpcClient extends EventEmitter {
  constructor(uri, logger) {
    super();
    this._socket = zmq.socket('req');
    this._uri = uri;

    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({
        'level': 'debug',
        'cli': true,
      });
    }

    // map msg id's for sequential tasks
    // delete the callbacks after use.
    this._msgMapping = {};
    this._initContextListener();
  }
  connect() {
    this._socket.connect(this._uri);
    this._logger.debug('IPC connected to ' + this._uri );
  }
  disconnect() {
    this._socket.disconnect(this._uri);
  }

  /**
   * This code validates and strips non necessary properties from the json.
   * the function to do this is taken from: https://github.com/tdegrunt/jsonschema/pull/101#issuecomment-132498537
   * It's basically loops over all the objects in the scheme and copys only them into the json instance
   * @param msg {JSON}
   * @param type {String}
   * @returns {ValidatorResult}
   * @private
   */
  static async _validateAndStrip(msg) {
    return new Promise((resolve, reject) => {
      const scheme = SCHEMES[msg.type];
      if (!scheme) {
        reject(`Missing type scheme: ${msg.type}`);
      }
      const finalScheme = nodeUtils.applyDelta(SCHEMES.BASE_SCHEME, scheme);
      finalScheme.additionalProperties = true; // This can be override because we're removing all additional
      const result = validate(msg, finalScheme, {
        rewrite: (instance, schema) => {
          const obj = {};
          if (typeof instance != 'object' || !schema.properties) return instance; // Checks if either instance or schema isn't of type object
          for (const n in schema.properties) { // Looks over the fields in the schema and copy only them from the instance.
            if (n in instance) obj[n] = instance[n];
          }
          return obj;
        },
      });
      // console.dir(result, {depth: null, colors: true});
      if (!result.valid) {
        console.error(JSON.stringify(result.instance));
        reject(`Validation Failed: ${JSON.stringify(result.instance)}`);
      } else {
        resolve(result.instance);
      }
    });
  }
  async sendJson(msg) {
    if (nodeUtils.isString(msg)) {
      msg = JSON.parse(msg);
    }
    const finalMsg = await IpcClient._validateAndStrip(msg);
    this._socket.send(JSON.stringify(finalMsg));
  }
  _initContextListener() {
    this._socket.on('message', (msg) => {
      msg = JSON.parse(msg);
      const callback = this._msgMapping[msg.id];
      if (callback) {
        callback(null, msg);
        // clear memory
        this._msgMapping[msg.id] = null;
      }
    });
  }
  /** Send a JSON message and trigger a callback once there's a response.
   * A unique msg.id is used to identify each response and its callback
   * @param {JSON} msg, must have id field
   * @param {Function} callback , (err, msg)=>{}
   * */
  async sendJsonAndReceive(msg, callback) {
    if (!msg.id) {
      callback(new errors.MissingFieldsErr('Missing msg ID'));
    }
    this._msgMapping[msg.id] = callback;
    try {
      await this.sendJson(msg);
    } catch (err) {
      callback(err);
    }
  }
  /** General response callback that will be called for every incoming message
   * Usage example - logging
   * @param {Function} responseCallback
   * */
  setResponseHandler(responseCallback) {
    this._socket.on('message', (msg)=>{
      msg = JSON.parse(msg);
      this.emit('message', msg);
      responseCallback(msg);
    });
  }
}

module.exports = IpcClient;

// /** mini test */
// const uri = 'tcp://127.0.0.1:5555';
// let client = new IpcClient(uri);
// client.setResponseHandler((msg)=>{
//   console.log("From Core %s", msg.s );
// });
//
// client.connect();
// client.sendJson({"yo":"susp??"});
//
