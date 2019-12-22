const log4js = require("log4js");
const constants = require("./constants");
const LOG_CONFIG = constants.LOG_CONFIG;
const format = require("date-format");

class Logger {
  constructor(options = {}) {
    const logName = options.hasOwnProperty("name") ? options.name : "Logger";
    const logLevel = options.hasOwnProperty("level") ? options.level : LOG_CONFIG.level;

    log4js.configure({
      appenders: {
        file: {
          type: "file",
          filename: LOG_CONFIG.file,
          maxLogSize: 10 * 1024 * 1024, // = 10Mb
          backups: 5, // keep five backup files
          compress: true, // compress the backups
          encoding: "utf-8",
          mode: 0o0640,
          flags: "w+"
        },
        out: {
          type: "stdout",
          layout: {
            type: "pattern",
            pattern: "$x{getTime}Z %[%p%] [P2P-%c] - %m",
            tokens: {
              getTime: function(logEvent) {
                return format.asString("yyyy-MM-ddThh:mm:ss", new Date(new Date().toUTCString().slice(0, -4)));
              },
            },
        },
        err: {
          type: "stderr",
          layout: {
            type: "pattern",
            pattern: "$x{getTime}Z %[%p%] [P2P-%c] - %m",
            tokens: {
              getTime: function(logEvent) {
                return format.asString("yyyy-MM-ddThh:mm:ss", new Date(new Date().toUTCString().slice(0, -4)));
              },
            },
          }
        },
        cli: {
          type: "stdout",
          layout: {
            type: "pattern",
            pattern: "$x{getTime}Z [CLI] %m",
            tokens: {
              getTime: function(logEvent) {
                return format.asString("yyyy-MM-ddThh:mm:ss", new Date(new Date().toUTCString().slice(0, -4)));
              },
            },
          }
        }
      },
      categories: {
        [logName]: { appenders: ["file", "out"], level: logLevel, enableCallStack: true },
        cli: { appenders: ["cli"], level: "info" },
        default: { appenders: ["err"], level: "info" }
      }
    });
    this.logger = log4js.getLogger(logName);
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
    this.logger.warn(content);
  }
  fatal(content) {
    this.logger.fatal(content);
  }
  trace(content) {
    this.logger.trace(content);
  }
}

module.exports = Logger;
