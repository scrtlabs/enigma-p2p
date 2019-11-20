const fs = require("fs");
const Log = require("log");
const constants = require("./constants");
const LOG_CONFIG = constants.LOG_CONFIG;

class Logger {
  constructor(options) {
    this._options = {};
    this._options.level = LOG_CONFIG.level;
    this._options.cli = LOG_CONFIG.cli;
    this._options.file = LOG_CONFIG.file;
    this._options.pretty = false;

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
      this._fileLogger = new Log(this._options.level, fs.createWriteStream(this._options.file));
    }
  }
  _log(content, type) {
    if (process.env.NODE_ENV == "test") {
      return;
    }

    if (this._cliLogger != null) {
      this._cliLogger[type](content);
    }
    if (this._fileLogger != null) {
      this._fileLogger[type](content);
    }
  }

  debug(content) {
    this._log(content, "debug");
  }
  info(content) {
    this._log(content, "info");
  }
  error(content) {
    this._log(content, "error");
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
