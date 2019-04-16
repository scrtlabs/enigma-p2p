const fs = require('fs');
const Log = require('log');
const constants = require('./constants');
const LOG_CONFIG = constants.LOG_CONFIG;

class Logger {
  constructor(options) {
    this._options = {};
    this._options.level = LOG_CONFIG.level;
    this._options.cli = LOG_CONFIG.cli;
    this._options.file = LOG_CONFIG.file;
    this._options.global = LOG_CONFIG.global;
    this._options.pretty =false;
    this._engNode = null;

    if (options != undefined) {
      if (options.level !== undefined) {
        this._options.level = options.level;
      }
      if (options.cli !== undefined) {
        this._options.cli = options.cli;
      }
      if (options.file !== undefined) {
        this._options.file = options.file;
      }
      if (options.global !== undefined) {
        this._options.global = options.global;
      }
      if (options.cli === undefined && options.pretty === true) {
        this._options.pretty = true;
      }
    }

    // initialize loggers

    this._cliLogger = null;
    this._fileLogger = null;

    if (this._options.cli) {
      this._cliLogger = new Log(this._options.level);
    }
    if (this._options.file) {
      this._fileLogger = new Log(this._options.level,
          fs.createWriteStream(this._options.file));
    }
  }

  isGlobal() {
    return this._options.global;
  }

  async _log(content, type) {
    if (this._cliLogger != null) {
      this._cliLogger[type](content);
    }
    if (this._fileLogger != null) {
      this._fileLogger[type](content);
    }
    if(this._options.global && this._engNode){
      let workerAddr;
      try {
        workerAddr = await this._engNode.getSelfSubscriptionKey();
      } catch(e) {
        console.log(`error global publish ${e}`);
        return;
      }
      // msg structure to store on the logger node DB
      let msg = {
        workerAddress : workerAddr,
        peerId : this._engNode.getSelfB58Id(),
        level : type,
        data : content
      };
      msg = JSON.stringify(msg);
      this._engNode.publish(constants.PUBSUB_TOPICS.GLOBAL_LOGGER, msg);
    }
  }

  debug(content) {
    this._log(content, 'debug');
  }
  info(content) {
    this._log(content, 'info');
  }
  error(content) {
    this._log(content, 'error');
  }
  setGlobalOutput(engNode){
    this._engNode = engNode;
  }
}


module.exports = Logger;

//
// let l = new Logger({
//     "level" : "debug",
//     "cli" : true
// });
//
// l.debug("hello");
// l.info("not hello");
// l.error("bad bad ");
