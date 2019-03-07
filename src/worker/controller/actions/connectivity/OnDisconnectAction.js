const constants = require('../../../../common/constants');

class OnDisconnectAction{

  constructor(controller){
    this._isRunning = false;
    this._controller = controller;
  }
  toggleIsRunning(){
    this._isRunning = !this._isRunning;
  }
  async execute(params){
    // check if persisting
    let shouldPersist = constants.CONSISTENT_DISCOVERY_PARAMS.SHOULD_PERSIST;
    if(this._controller.getExtraConfig().discovery){
      shouldPersist = this._controller.getExtraConfig().discovery.persistent;
    }
    if(shouldPersist && !this._isRunning){
      // check if critical dht
      let connections = await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.GET_HANDSHAKE_NUM);
      if(connections && connections.outbounds){
        if(connections.outbounds.length < constants.DHT_STATUS.CRITICAL_LOW_DHT_SIZE){
          // do discovery
          this.toggleIsRunning();
          this._controller.execCmd(constants.NODE_NOTIFICATIONS.CONSISTENT_DISCOVERY,{
            delay : constants.CONSISTENT_DISCOVERY_PARAMS.DELAY,
            maxRetry : constants.CONSISTENT_DISCOVERY_PARAMS.MAX_RETRY,
            timeout : constants.CONSISTENT_DISCOVERY_PARAMS.TIMEOUT,
            callback : (status,result)=>{
              this.toggleIsRunning();
            }
          })
        }
      }
    }
  }
}
module.exports = OnDisconnectAction;
