/**
 * This should be called after the software is started.
 * TODO:: https://github.com/enigmampc/enigma-p2p#overview-on-start
 * TODO:: this could be implemented better and persist for each step.
 * TODO:: For example, lets say that SyncStat fails, right now it just continues and notifies the user.
 * TODO:: it can keep trying just like PersistentDiscovery
 *
 * * ------------------------------------------------------------------------------
 * BOOTSTRAP + DISCOVERY:
 * Connect to hardcoded well-known Bootstrap nodes to get seeds (i.e peers) from.
 * * ------------------------------------------------------------------------------
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


const constants = require('../../../common/constants');
const waterfall = require('async/waterfall');
class InitWorkerAction {
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * @param {Function} optinal callback (err)=>{}
   * */
  execute(params) {
    const callback = params.callback;
    const C = constants.NODE_NOTIFICATIONS;
    const P = constants.CONSISTENT_DISCOVERY_PARAMS;
    // methods
    const discovery = (cb)=>{
      this._controller.execCmd(C.CONSISTENT_DISCOVERY, {
        delay: P.DELAY,
        maxRetry: P.MAX_RETRY,
        timeout: P.TIMEOUT,
        callback: (status, result)=>{
          const outMsg = 'Discovery status: ' + JSON.stringify(status);
          this._controller.logger().info(outMsg);
          cb(null);
        },
      });
    };
    const syncState = (cb)=>{
      if(!this._controller.hasEthereum()){
        return cb(null);
      }
      this._controller.execCmd(C.SYNC_RECEIVER_PIPELINE, {
        cache: false,
        onEnd: (err, statusResult)=>{
          if (err) {
            this._controller.logger().error('error receiving pipeline! ' + err);
          } else {
            this._controller.logger().debug(JSON.stringify(statusResult));
            this._controller.logger().info('success syncing pipeline');
          }
          cb(err);
        },
      });
    };
    const announceState =(cb)=>{
      this._controller.execCmd(C.ANNOUNCE_LOCAL_STATE, {
        cache: false,
        onResponse: (error, content)=>{
          if (error) {
            this._controller.logger().error('failed announcing ' + error);
          } else {
            content.forEach((ecid)=>{
              this._controller.logger().debug('providing : ' + ecid.getKeccack256());
            });
          }
          cb(error);
        },
      });
    };
    const backgroundServices = (cb)=>{
      // TODO:: lena, here your EthereumServices should start. For example, read current Epoch data (like worker params)
      if(this._controller.hasEthereum()){
        this._controller.ethereum().services().on(constants.ETHEREUM_EVENTS.NewEpoch,
          function (error, event) {
            if (err) {
              this._controller.logger().error('failed subscribing to NewEpoch events ' + error);
            }
            else {
              this._controller.execCmd(C.GET_STATE_KEYS);
            }
          });
      }
      // TODO:: everything that runs in an infinite loop in the program should be started here.
      // TODO:: for example we could start here a process to always ping enigma-core and check if ok
      // subscribe to self (for responding to rpc requests of other workers)
      this._controller.execCmd(C.SELF_KEY_SUBSCRIBE, {});
      // log finish this stage
      this._controller.logger().debug('started background services');
      cb(null);
    };
    const registerAndLoginWorker = (cb)=>{
      console.log('---> should register with Ethereum, use $getRegistration cmd to get the required params');
      if(this._controller.hasEthereum()){

      }
      cb(null);
    };
    waterfall([
      // BOOTSTRAP + DISCOVERY:
      discovery,
      // Sync State
      syncState,
      // Announce State:
      announceState,
      // Background Services:
      backgroundServices,
      // register and login worker
      registerAndLoginWorker,
    ], (err)=>{
      if (err) {
        this._controller.logger().error('error InitWorkerAction ' + err);
      } else {
        this._controller.logger().info('success InitWorkerAction');
      }
      if (callback) {
        callback(err);
      }
    });
  }
}
module.exports = InitWorkerAction;
