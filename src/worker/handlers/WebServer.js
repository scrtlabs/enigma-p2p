const express = require("express");
const EventEmitter = require("events").EventEmitter;
const constants = require("../../common/constants");
const WEB_SERVER_CONSTANTS = constants.WEB_SERVER_CONSTANTS;

class WebServer extends EventEmitter {
  constructor(config, logger) {
    super();

    if (config && config.healthCheck.port) {
      this._healthCheckPort = config.healthCheck.port;
    } else {
      this._healthCheckPort = WEB_SERVER_CONSTANTS.HEALTH_CHECK.port;
    }
    if (config && config.healthCheck.url) {
      this._healthCheckUrl = config.healthCheck.url;
    } else {
      this._healthCheckUrl = WEB_SERVER_CONSTANTS.HEALTH_CHECK.url;
    }
    this._logger = logger;
    this._server = express();
  }

  init() {
    this._server.listen(this._healthCheckPort);
    this._server.get(this._healthCheckUrl, this.performHealthCheck.bind(this));
    this._logger.debug(`listening on port ${this._healthCheckPort} for healthcheck on URL ${this._healthCheckUrl}`);
  }

  /**
   * Notify observer (Some controller subscribed)
   * @param {JSON} params, MUST CONTAIN notification field
   */
  notify(params) {
    this.emit("notify", params);
  }

  async performHealthCheck(req, res, next) {
    //res.send("OK");
    this.notify({
      notification: constants.NODE_NOTIFICATIONS.HEALTH_CHECK,
      callback: (err, result) => {
        if (result.status) {
          res.send("OK");
        } else {
          next(500);
        }
      }
    });
  }
}

module.exports = WebServer;
