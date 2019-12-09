const express = require("express");
const http = require("http");
const EventEmitter = require("events").EventEmitter;
const constants = require("../../common/constants");
const WEB_SERVER_CONSTANTS = constants.WEB_SERVER_CONSTANTS;

const mgmtActions = [
  constants.NODE_NOTIFICATIONS.REGISTER,
  constants.NODE_NOTIFICATIONS.LOGIN,
  constants.NODE_NOTIFICATIONS.LOGOUT,
];

class ManagementServer extends EventEmitter {
  constructor(config, logger) {
    super();
    if (!config.hasOwnProperty("mgmtBase")) {
      throw new Error("Webserver config doesn't contain 'mgmtBase' option required");
    }
    this._mgmtPort = Object.prototype.hasOwnProperty.call(config["mgmtBase"], "port") ? config["mgmtBase"].port : WEB_SERVER_CONSTANTS.MGMT.port;
    this._mgmtUrl= Object.prototype.hasOwnProperty.call(config["mgmtBase"], "url") ? config["mgmtBase"].url : WEB_SERVER_CONSTANTS.MGMT.url;

    this._logger = logger;
    this._app = express();
    this._server = null;
  }

  start() {
    this._server = http.createServer(this._app);
    this._server.listen(this._mgmtPort);
    mgmtActions.forEach( (item) => {
      this._app.get(`${this._mgmtUrl}/${item}`, this.performAction.bind(this, item));
    } );
    this._logger.debug(`listening on port ${this._mgmtPort} for management on URL ${this._mgmtUrl}`);
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

  async performAction(notification, req, res, next) {
    //res.send("OK");
    this._logger.info(`Got notification ${notification}`);
    this.notify({
      notification: notification,
      callback: (err, result) => {
        if (result.status) {
          res.send("OK");
        } else {
          next(WEB_SERVER_CONSTANTS.error_code);
        }
      }
    });
  }
}

module.exports = ManagementServer;
