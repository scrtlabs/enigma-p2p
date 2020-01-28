/**
 * This should be called after the software is started.
 * TODO:: https://github.com/enigmampc/enigma-p2p#overview-on-start
 * TODO:: this could be implemented better and persist for each step.
 * TODO:: For example, lets say that SyncStat fails, right now it just continues and notifies the user.
 * TODO:: it can keep trying
 *
 * Sync State:
 * Synchronize the Worker state: Secret contracts bytecode and deltas.
 * * ------------------------------------------------------------------------------
 * Announce State:
 * Update the DHT registries with the content available (i.e deltas) for other peers to sync.
 * * ------------------------------------------------------------------------------
 * Background Services:
 * Such as Ethereum listener, JsonRpcAPI etc.
 * * ------------------------------------------------------------------------------
 * Register to Enigma.sol
 * should be done manually, no point automating this. get the info with $getRegistration cli cmd.
 * */

const constants = require("../../../common/constants");
const waterfall = require("async/waterfall");

class InitWorkerAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * @param {Function} optional callback (err)=>{}
   * */
  execute(params) {
    const callback = params.callback;
    const C = constants.NODE_NOTIFICATIONS;

    if (this._controller.isWorkerInitialized()) {
      this._controller.logger().debug("Worker was already initialized.. Skipping");
      if (callback) {
        callback(null);
      }
      return;
    }

    this._controller.startInitWorker();
    // methods
    const syncState = cb => {
      if (!this._controller.hasEthereum()) {
        return cb(null);
      }
      this._controller.execCmd(C.SYNC_RECEIVER_PIPELINE, {
        onEnd: (err, statusResult) => {
          cb(err);
        }
      });
    };
    const announceState = cb => {
      this._controller.execCmd(C.ANNOUNCE_LOCAL_STATE, {
        onResponse: (error, content) => {
          if (error) {
            this._controller.logger().error("failed announcing " + error);
          } else {
            content.forEach(ecid => {
              this._controller.logger().debug("providing : " + ecid.getKeccack256());
            });
          }
          cb(error);
        }
      });
    };
    const backgroundServices = cb => {
      if (this._controller.hasEthereum()) {
        this._controller
          .ethereum()
          .services()
          .on(
            constants.ETHEREUM_EVENTS.NewEpoch,
            function(error, event) {
              if (error) {
                this._controller.logger().error("failed subscribing to NewEpoch events " + error);
              } else {
                this._controller.execCmd(C.GET_STATE_KEYS);
              }
            }.bind(this)
          );
      }
      // TODO:: everything that runs in an infinite loop in the program should be started here.
      // TODO:: for example we could start here a process to always ping enigma-core and check if ok
      // subscribe to self (for responding to rpc requests of other workers)
      this._controller.execCmd(C.SELF_KEY_SUBSCRIBE, {});
      // log finish this stage
      setInterval(() => {
        this._controller.logger().info("Starting periodic local state announcement");
        waterfall(
          [
            // Sync State
            syncState,
            // Announce State:
            announceState
          ],
          err => {
            if (err) {
              this._controller.logger().error(`error in periodic local state announcement: ${err}`);
            } else {
              this._controller.logger().info(`periodic local state announcement finished successfully`);
            }
          }
        );
      }, constants.PERIODIC_ANNOUNCEMENT_INTERVAL_MILI);
      this._controller.logger().debug("started background services");
      cb(null);
    };
    const registerWorker = async () => {
      if (this._controller.hasEthereum()) {
        let workerParams = null;

        try {
          workerParams = await this._controller.asyncExecCmd(C.GET_ETH_WORKER_PARAM);
        } catch (err) {
          return this._controller
            .logger()
            .error("error InitWorkerAction- Reading worker params from ethereum failed" + err);
        }
        // If the worker is already logged-in, nothing to do
        if (
          workerParams.status === constants.ETHEREUM_WORKER_STATUS.LOGGEDIN ||
          workerParams.status === constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT
        ) {
          this._controller.logger().info("InitWorkerAction- worker is already registered");
          return;
        }
        try {
          await this._controller.asyncExecCmd(C.REGISTER);
        } catch (err) {
          return this._controller.logger().error("error InitWorkerAction- Register to ethereum failed" + err);
        }
      }
    };
    waterfall(
      [
        // Sync State
        syncState,
        // Announce State:
        announceState,
        // Background Services:
        backgroundServices,
        // register and login worker
        registerWorker
      ],
      err => {
        if (err) {
          this._controller.logger().error("error InitWorkerAction " + err);
        } else {
          this._controller.logger().info("success InitWorkerAction");
        }
        this._controller.initWorkerDone();
        if (callback) {
          callback(err);
        }
      }
    );
  }

  asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.callback = function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };
      action.execute(params);
    });
  }
}
module.exports = InitWorkerAction;
