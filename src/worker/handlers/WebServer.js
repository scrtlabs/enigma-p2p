const express = require("express");
const http = require("http");
const EventEmitter = require("events").EventEmitter;
const constants = require("../../common/constants");
const WEB_SERVER_CONSTANTS = constants.WEB_SERVER_CONSTANTS;

class WebServer extends EventEmitter {
  constructor(config, logger) {
    super();

    if (config && config.port) {
      this._port = config.port;
    } else {
      this._port = WEB_SERVER_CONSTANTS.port;
    }
    if (config.healthCheck && config.healthCheck.url) {
      this._healthCheckUrl = config.healthCheck.url;
    } else {
      this._healthCheckUrl = WEB_SERVER_CONSTANTS.health.url;
    }
    if (config.status && config.status.url) {
      this._statusUrl = config.status.url;
    } else {
      this._statusUrl = WEB_SERVER_CONSTANTS.status.url;
    }
    this._logger = logger;
    this._app = express();
    this._server = null;
  }

  start() {
    this._server = http.createServer(this._app);
    this._server.listen(this._port);
    this._app.get(this._healthCheckUrl, this.performHealthCheck.bind(this));
    this._app.get(this._statusUrl, this.getStatus.bind(this));
    this._logger.debug(
      `listening on port ${this._port} for health check on URL ${this._healthCheckUrl} and status queries on URL ${this._statusUrl}`
    );
  }

  stop() {
    if (this._server) {
      this._server.close();
    }
  }
  /**
   * Notify observer (Some controller subscribed)
   * @param {JSON} params, MUST CONTAIN notification field
   */
  notify(params) {
    this.emit("notify", params);
  }

  async performHealthCheck(req, res, next) {
    this.notify({
      notification: constants.NODE_NOTIFICATIONS.HEALTH_CHECK,
      callback: (err, result) => {
        if (result.status) {
          res.send(result);
        } else {
          next(WEB_SERVER_CONSTANTS.error_code);
        }
      }
    });
  }

  async getStatus(req, res, next) {
    this.notify({
      notification: constants.NODE_NOTIFICATIONS.GET_WORKER_STATUS,
      callback: (err, status) => {
        if (err) {
          next(WEB_SERVER_CONSTANTS.error_code);
        } else {
          res.send(status);
        }
      }
    });
  }
}

module.exports = WebServer;
