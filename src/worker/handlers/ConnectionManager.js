const EventEmitter = require('events').EventEmitter;
const parallel = require('async/parallel');
const Policy = require('../../policy/policy');
const constants = require('../../common/constants');
const STATUS = constants.MSG_STATUS;
const N_NOTIFICATION = constants.NODE_NOTIFICATIONS;
const nodeUtils = require('../../common/utils');
const Messages = require('../../policy/p2p_messages/messages');
const Logger = require('../../common/logger');

class ConnectionManager extends EventEmitter {
  constructor(enigmaNode, logger) {
    super();

    // initialize logger
    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({
        'level': 'debug',
        'cli': true,
      });
    }
    this._enigmaNode = enigmaNode;
    this._policy = new Policy();
    // context (currently Stat class)
    this._ctx = null;
    this._handshakedDiscovery = [];
    // connection manager state
    this.BOOTSTRAPPED = 'BOOTSTRAPPED';
    this.NOT_BOOTSTRAPPED = 'NOTBOOTSTRAPPED';
    this._state = this.NOT_BOOTSTRAPPED;
  }
  /** add context
   * @param {Stats} context
   */
  addNewContext(context) {
    this._ctx = context;
  }
  /** Ping 0x1 message in the handshake process.
   *  @param {PeerInfo} peerInfo , the peer info to handshake with
   * @param {Function} onHandshake , (err,ping,pong)=>{}
   */
  handshake(peerInfo, onHandshake) {
    this._enigmaNode.handshake(peerInfo, (err, dialedPeerInfo, ping, pong)=>{
      // TODO:: open question: if it's early connected peer to DNS then it would get 0
      // TODO:: peers, in that case another query is required.
      if (err) {
        // TODO:: handle the error
        this._logger.error('[-] Err performing handshake : ' + err);
      } else if (!err && pong != null && pong.status() == STATUS['OK']) {
        peerInfo = dialedPeerInfo;
        //this._updateHandshakePeerBank(pong, peerInfo.id.toB58String());
        //this._handshakedDiscovery.push(pong);
        this.notify({
          'notification': N_NOTIFICATION['HANDSHAKE_UPDATE'],
          'connectionType': 'outbound',
          'status': pong.status(),
          'pong': pong,
          'discoverd_num': this._handshakedDiscovery.length,
          'who': peerInfo,
        });
        this._updateState();
      }
      if (nodeUtils.isFunction(onHandshake)) {
        onHandshake(err, ping, pong);
      }
    });
  }

  /** Ping 0x1 message in the handshake process.
   *  @param {PeerInfo} peerInfo , the peer info to handshake with
   * @param {Function} onConnection , (err, )=>{}
   */
  dialBootstrap(peerInfo, onConnection) {
    this._enigmaNode.dialToBootstrap(peerInfo, (err, dialedPeerInfo)=>{
      if (err) {
        // TODO:: handle the error
        this._logger.error('[-] Err connecting to bootstrap handshake : ' + err);
      }
      if (onConnection) {
        onConnection(err);
      }
    });
  }

  /**
   * Notify observer (Some controller subscribed)
   * @param {Json} params, MUTS CONTAINT notification field
   */
  notify(params) {
    this.emit('notify', params);
  }

  /** Send a heart-beat to some peer
   * @param {PeerInfo} peer - could be string b58 id as well (not implemented error atm for string)
   * @return {Promise} Heartbeat result
   */
  sendHeartBeat(peer) {
    return new Promise((resolve, reject)=>{
      let peerInfo;

      if (nodeUtils.isString(peer)) {
        // TODO:: create PeerInfo from B58 id
        throw new Error({name: 'NotImplementedError', message: 'too lazy to implement'});
      } else {
        // PeerInfo
        peerInfo = peer;
      }
      // build the msg
      const heartBeatRequest = new Messages.HeartBeatReqMsg({
        'from': this._enigmaNode.getSelfIdB58Str(),
        'to': peerInfo.id.toB58String(),
      });
      if (!heartBeatRequest.isValidMsg()) {
        // TODO:: Add logger.
        reject('[-] Err in HBReq msg ');
      }
      // send the request
      this._enigmaNode.sendHeartBeat(peerInfo, heartBeatRequest, (err, hbResponse)=>{
        if (err) reject(err);

        resolve(hbResponse);
      });
    });
  }
}

module.exports = ConnectionManager;


