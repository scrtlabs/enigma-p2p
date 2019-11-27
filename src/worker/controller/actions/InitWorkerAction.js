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

const errors = require("../../../common/errors");
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
    const depositAmount = params.amount;

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
        cache: false,
        onEnd: (err, statusResult) => {
          if (!err || err instanceof errors.SyncReceiverNoMissingDataErr) {
            this._controller.logger().info("success syncing pipeline");
            err = null;
          } else {
            this._controller.logger().error("error receiving pipeline! " + err);
          }
          cb(err);
        }
      });
    };
    const announceState = cb => {
      this._controller.execCmd(C.ANNOUNCE_LOCAL_STATE, {
        cache: false,
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
      this._controller.logger().debug("started background services");
      cb(null);
    };
    const registerAndLoginWorker = async () => {
      if (this._controller.hasEthereum()) {
        let workerParams = null;
        let registered = false;
        let isDeposit = false;
        let isLogIn = false;

        try {
          workerParams = await this._controller.asyncExecCmd(C.GET_ETH_WORKER_PARAM);
        } catch (err) {
          return this._controller
            .logger()
            .error("error InitWorkerAction- Reading worker params from ethereum failed" + err);
        }
        // If the worker is already logged-in, nothing to do
        if (workerParams.status === constants.ETHEREUM_WORKER_STATUS.LOGGEDIN) {
          this._controller.logger().info("InitWorkerAction- worker is already logged-in");
          return;
        }
        if (workerParams.status === constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT) {
          registered = true;
        }
        // Check if  the worker should deposit money and login after registration
        if (depositAmount) {
          if (workerParams.status === constants.ETHEREUM_WORKER_STATUS.UNREGISTERED) {
            isDeposit = workerParams.balance > 0;
          }
        }
        // The worker should only register, if it is required
        else {
          isDeposit = true;
          isLogIn = true;
        }
        if (!registered) {
          try {
            registered = await this._controller.asyncExecCmd(C.REGISTER);
          } catch (err) {
            return this._controller.logger().error("error InitWorkerAction- Register to ethereum failed" + err);
          }
        }
        if (!isDeposit && registered) {
          try {
            isDeposit = await this._controller.asyncExecCmd(C.DEPOSIT, {
              amount: depositAmount
            });
          } catch (err) {
            return this._controller.logger().error("error InitWorkerAction- Deposit stake failed" + err);
          }
        }
        if (!isLogIn && isDeposit) {
          try {
            isLogIn = await this._controller.asyncExecCmd(C.LOGIN);
          } catch (err) {
            return this._controller.logger().error("error InitWorkerAction- Login to ethereum failed" + err);
          }
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
        registerAndLoginWorker
      ],
      err => {
        if (err) {
          this._controller.logger().error("error InitWorkerAction " + err);
        } else {
          this._controller.logger().info("success InitWorkerAction");
          this._controller.initWorkerDone();
        }
        if (callback) {
          callback(err);
        }
      }
    );
  }

  async asyncExecute(params) {
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
