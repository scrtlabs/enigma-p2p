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

class InitWorkerAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * @param {Function} optional callback (err)=>{}
   * */
  async execute(params) {
    const callback = params.callback;
    const C = constants.NODE_NOTIFICATIONS;
    let error = null;

    if (this._controller.isWorkerInitialized()) {
      this._controller.logger().debug("worker was already initialized.. Skipping");
      if (callback) {
        callback(null);
      }
      return;
    }

    this._controller.startInitWorker();
    try {
      if (this._controller.hasEthereum()) {
        this._controller.logger().debug("starting sync");
        await this._controller.asyncExecCmd(C.SYNC_RECEIVER_PIPELINE, {});
      }

      this._controller.logger().debug("starting announcing local state");
      const content = await this._controller.asyncExecCmd(C.ANNOUNCE_LOCAL_STATE, {});
      content.result.forEach(ecid => {
        this._controller.logger().debug("providing: " + ecid.getKeccack256());
      });

      // TODO:: everything that runs in an infinite loop in the program should be started here.
      // TODO:: for example we could start here a process to always ping enigma-core and check if ok
      this._controller.logger().debug("starting background services");
      if (this._controller.hasEthereum()) {
        // subscribe to new epoch events
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
      // subscribe to self (for responding to rpc requests of other workers)
      this._controller.execCmd(C.SELF_KEY_SUBSCRIBE, {});

      // add timer for checking synchronization status and announcing local state
      const timer = setInterval(async () => {
        this._controller.logger().info("starting periodic local state announcement");
        try {
          this._controller.logger().debug("starting sync");
          await this._controller.asyncExecute(C.SYNC_RECEIVER_PIPELINE, {});
          this._controller.logger().debug("starting announcing local state");
          const content = this._controller.asyncExecCmd(C.ANNOUNCE_LOCAL_STATE, {});
          content.result.forEach(ecid => {
            this._controller.logger().debug("providing: " + ecid.getKeccack256());
          });
          this._controller.logger().info(`periodic local state announcement finished successfully`);
        } catch (err) {
          this._controller.logger().error(`error in periodic local state announcement: ${err}`);
        }
      }, constants.PERIODIC_ANNOUNCEMENT_INTERVAL_MILI);
      this._controller.addTimer(timer);

      // register worker
      await this._controller.asyncExecCmd(C.REGISTER);
      this._controller.logger().info("success InitWorkerAction");
    } catch (err) {
      this._controller.logger().error("error InitWorkerAction " + err);
      error = err;
    }
    this._controller.initWorkerDone();
    if (callback) {
      callback(error);
    }
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
