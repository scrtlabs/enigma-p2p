const log4js = require("log4js");
const constants = require("./constants");
const LOG_CONFIG = constants.LOG_CONFIG;

class Logger {
  constructor(options) {
    const logLevel = options.hasOwnProperty("level") ? options.level : LOG_CONFIG.level;
    log4js.configure( {
      appenders: {
        file: {
          type: "file",
          filename: LOG_CONFIG.file,
          maxLogSize: 10 * 1024 * 1024, // = 10Mb
          backups: 5, // keep five backup files
          compress: true, // compress the backups
          encoding: "utf-8",
          mode: 0o0640,
          flags: "w+",
        },
        out: {type: "stdout"},

      },
      categories:
        {default: {appenders: ["file", "out"], level: logLevel}},
    });
    this.logger = log4js.getLogger();
  }
  debug(content) {
    this.logger.debug(content);
  }
  info(content) {
    this.logger.info(content);
  }
  error(content) {
    this.logger.error(content);
  }
  warn(content) {
    this.logger.error(content);
  }
  fatal(content) {
    this.logger.error(content);
  }
  trace(content) {
    this.logger.error(content);
  }
}

module.exports = Logger;

