const EventEmitter = require("events").EventEmitter;
const fs = require("fs");
const waterfall = require("async/waterfall");
const PeerId = require("peer-id");
const PeerInfo = require("peer-info");
const pull = require("pull-stream");
const PeerBundle = require("./libp2p-bundle");
const constants = require("../common/constants");
const PROTOCOLS = constants.PROTOCOLS;
const MSG_STATUS = constants.MSG_STATUS;
const Policy = require("../policy/policy");
const Messages = require("../policy/p2p_messages/messages");
const nodeUtils = require("../common/utils");
const Logger = require("../common/logger");
const errors = require("../common/errors");
const { promisify } = require("util");

class EnigmaNode extends EventEmitter {
  constructor(config, protocolHandler, logger) {
    super();
    // to handle unsubscribe
    this._topicHandlersMap = {};
    // initialize logger
    if (logger) {
      this._logger = logger;
    } else {
      this._logger = new Logger({
        level: "debug",
        name: "EnigmaNode"
      });
    }

    this.nickname = config.nickname;
    this.multiAddrs = config.multiAddrs;
    this.isDiscover = config.isDiscover;
    this.dnsNodes = config.dnsNodes;
    this._pathPeerId = null;
    if ("pathPeerId" in config && config["pathPeerId"] != null && config["pathPeerId"] != undefined) {
      this._pathPeerId = config.pathPeerId;
    }
    this.started = false;
    this.node = null;
    this.policy = new Policy();
    this._handler = protocolHandler;
  }
  nickName() {
    return this.nickname;
  }
  getProtocolHandler() {
    return this._handler;
  }
  /**
   * Loads a peer info JSON from a given path and creates a node instance
   * @param {String} path
   * @param {Function} callback - empty callback with no params
   */
  loadNode(path, callback) {
    fs.readFile(path, (err, data) => {
      if (err) callback(err);

      PeerId.createFromJSON(JSON.parse(data), (err, idListener) => {
        if (err) callback(err);

        const peerInfo = new PeerInfo(idListener);
        this.multiAddrs.forEach(addr => {
          peerInfo.multiaddrs.add(addr);
        });
        this.node = new PeerBundle({
          peerInfo,
          config: {
            peerDiscovery: {
              bootstrap: {
                enabled: this.isDiscover,
                list: this.dnsNodes
              }
            }
          }
        });
        setTimeout(callback, 100);
      });
    });
  }
  /**
   * Create a random peerInfo and initialize a node instance
   * @param {Function} callback - empty callback with no params
   */
  createNode(callback) {
    waterfall(
      [
        cb => PeerInfo.create(cb),
        (peerInfo, cb) => {
          this.multiAddrs.forEach(addr => {
            peerInfo.multiaddrs.add(addr);
          });
          this.node = new PeerBundle({
            peerInfo,
            config: {
              peerDiscovery: {
                bootstrap: {
                  enabled: this.isDiscover,
                  list: this.dnsNodes
                }
              }
            }
          });
          setTimeout(cb, 100);
        }
      ],
      err => callback(err)
    );
  }
  /** Promise
   * Create a random peerInfo and initialize a node instance
   * @return {Promise}
   */
  syncCreateNode() {
    return new Promise((res, rej) => {
      this.createNode(err => {
        if (err) rej(err);
        res(this);
      });
    });
  }
  /** Promise
   * Load PeerID and create the peerInfo
   * @param {string} path
   * @return {Promise}
   */
  syncLoadNode(path) {
    return new Promise((res, rej) => {
      this.loadNode(path, () => {
        res(this);
      });
    });
  }
  /**
   * Define event handlers for the node with external delegation
   */
  addHandlers() {
    const protocols = this._handler.getProtocolsList();

    if (!this.started) {
      throw Error("not all protocols are satisfied, check constants.js for more info.");
    }
    this.node.on(PROTOCOLS.PEER_DISCOVERY, peer => {
      this._handler.handle(PROTOCOLS.PEER_DISCOVERY, this.node, {
        peer: peer,
        worker: this
      });
    });

    this.node.on(PROTOCOLS.PEER_CONNECT, peer => {
      this._handler.handle(PROTOCOLS.PEER_CONNECT, this.node, {
        peer: peer,
        worker: this
      });
    });
    this.node.on(PROTOCOLS.PEER_DISCONNECT, peer => {
      this._handler.handle(PROTOCOLS.PEER_DISCONNECT, this.node, {
        peer: peer,
        worker: this
      });
    });
    protocols.forEach(protocolName => {
      this.node.handle(protocolName, (protocol, conn) => {
        this._handler.handle(protocolName, this.node, {
          protocol: protocol,
          connection: conn,
          worker: this
        });
      });
    });
  }
  /** isConnected to a peer
   * This function uses try/catch because of the DHT implementation
   * @param {String} strId, some peer ID;
   * @return {Boolean} found - true = connected false otherwise
   */
  isConnected(strId) {
    return this.getConnectedPeers().indexOf(strId) > -1;
  }
  /** checks if the node has any connections to another node
   * @return {Boolean} true if there are connected peers, false otherwise
   */
  arePeersConnected() {
    return this.getConnectedPeers().length > 0;
  }
  /**
   * Subscribe to events with handlers and final handlers.
   * @param {Array} subscriptions, [{topic:name,topic_handler:Function(msg)=>{},final_handler:Function()=>{}}]
   * - topic_handler -> what to do the message received from the publisher
   * - final_handler -> only once when subscribed.
   */
  subscribe(subscriptions) {
    if (!this.started) {
      throw new errors.InitPipelinesErr("Please start the Worker before subscribing");
    }
    subscriptions.forEach(sub => {
      this._topicHandlersMap[sub.topic] = sub.topic_handler;
      this.node.pubsub.subscribe(sub.topic, sub.topic_handler, sub.final_handler);
    });
  }
  /*
   * Unsubscribe from topic
   * **/
  unsubscribe(topic, handler) {
    if (!this.started) {
      throw new errors.InitPipelinesErr("Please start the Worker before subscribing");
    }
    this.node.pubsub.unsubscribe(topic, handler, err => {
      if (err) {
        return this._logger.error(`failed to unsubscribe from ${topic}` + err);
      }
      this._logger.debug(`unsubscribed from ${topic}`);
    });
  }
  /**
   * get list of topics subscribed to
   * @param {Promise<Array<string>>} Calls back with an error or a list of topicIDs that this peer is subscribed to.
   * */
  async getTopics() {
    return new Promise((res, rej) => {
      this.node.pubsub.ls((err, topics) => {
        if (err) return rej(err);
        res(topics);
      });
    });
  }
  defaultSubscribe() {
    if (!this.started) {
      throw new errors.InitPipelinesErr("Please start the Worker before subscribing");
    }

    const subscriptions = this._handler.getSubscriptionsList();

    subscriptions.forEach(topic => {
      this.node.pubsub.subscribe(
        topic,
        message => {
          const params = {
            worker: this
          };

          this._handler.handleTopic(params, message);
        },
        () => {
          this._logger.debug("subscribed " + topic);
        }
      );
    });
  }
  /**
   * Broadcast some message about a specific topic
   * @param {String} topic, topic name
   * @param {Buffer} content, Buffer.from('some msg')
   * @param {Function} oncePublishedCallback, no params callback notifying that the message was published
   */
  broadcast(topic, content, oncePublishedCallback) {
    this.node.pubsub.publish(topic, content, oncePublishedCallback);
  }
  /**
   * Broadcast some message about a specific topic in a LOOP
   * @param {String} topic, topic name
   * @param {Integer} interval , rate in milli of broadcasting
   * @param {Buffer} content, Buffer.from('some msg')
   * @param {Function} oncePublishedCallback, no params callback notifying that the message was published
   * @return {Integer} intervalID , the ID of the interval to be shutdown in another context
   */
  broadcastLoop(topic, interval, content, oncePublishedCallback) {
    const intervalID = setInterval(() => {
      this.broadcast(topic, content, oncePublishedCallback);
    }, interval);
    return intervalID;
  }
  /**
   * Get a string array of full multiaddresses of the Node.
   * @returns {Array} str_addrs, array of multi-addresses in str format
   */
  // maStr = '/ip4/127.0.0.1/tcp/36601/ipfs/QmdvtnrtdzgXreTPRWfDbPguNsLC7vq4MK4AULKxfHU73F/';
  getListeningAddrs() {
    const strAddrs = [];
    this.node.peerInfo.multiaddrs.forEach(addr => {
      strAddrs.push(addr.toString());
    });
    return strAddrs;
  }
  /**
   * Get PeerInfo class of libp2p containing information about the current peer.
   * @return {PeerInfo} peerInfo
   */
  getSelfPeerInfo() {
    return this.node.peerInfo;
  }
  /**
   * Get id in format of base58 str
   * @return {String} peer-id
   */
  getSelfIdB58Str() {
    return this.getSelfPeerInfo().id.toJSON().id;
  }
  /**
   * Get All current peers String ID
   * @return {Array} id's
   */
  getAllPeersIds() {
    return this.node.stats.peers();
  }
  /** TODO: update once libp2p version is upgraded !!!!!!!!
   * @return {Array}, the current connected peers
   */
  getConnectedPeers() {
    return [...this.node.connectionManager._peerValues.keys()];
  }
  /**
   * Get All the Peer info from the peer book.
   * @return {Array} [PeerInfo]
   */
  getAllPeersInfo() {
    const peers = this.getAllPeersIds();
    const result = [];
    // get peers info by id
    peers.forEach(peer => {
      try {
        result.push(this.node.peerBook.get(peer));
      } catch (err) {
        this._logger.error("[-] Error finding peer" + err);
      }
    });
    return result;
  }
  /**
   * Start the node.
   * @param {Function} callback is a function with the following function (err) {} signature,
   * where err is an Error in case starting the node fails.
   */
  start(callback) {
    this.node.start(err => {
      this.started = true;
      callback();
    });
  }

  /** !! This is a high api function that should be used after new EnigmaNode(options)... just do node.run();
   * run the node (build first)
   * @return {Promise}
   */
  syncRun() {
    return new Promise(async (resolve, reject) => {
      // load node
      await this.syncInit(this._pathPeerId);
      // start the node
      await this.syncStart();
      // add handlers
      this.addHandlers();

      // add subscriptions
      this.defaultSubscribe();

      resolve(this);
    });
  }
  /**
   * Sync Start the node.
   * where err is an Error in case starting the node fails.
   * @return {Promise}
   */
  syncStart() {
    return new Promise((res, rej) => {
      this.start(() => {
        this._logger.info(this.getSelfIdB58Str() + " has started ");
        res(this);
      });
    });
  }
  /** Init the node - either load the id from a file or create a new random one
   * This function should be called after the new EnigmaNode()
   * @param {string} path - path to node id, default null -> create a new random id s
   * @return {Promise} promise
   */
  syncInit(path = null) {
    if (path) {
      return this.syncLoadNode(path);
    } else {
      return this.syncCreateNode();
    }
  }
  /**
   * Stop the node.
   * @param {Function} callback is a function with the following function (err) {} signature,
   * where err is an Error in case stopping the node fails.
   */
  stop(callback) {
    this.node.stop(callback);
  }
  /**
   * Sync Stop the node.
   * where err is an Error in case stopping the node fails.
   * @return {Promise}
   */
  syncStop() {
    return new Promise((res, rej) => {
      this.stop(err => {
        if (err) rej(err);
        res(this);
      });
    });
  }
  /**
   * Dial at some protocol and delegate the handling of that connection
   * @param {PeerInfo} peerInfo,  the peer we wish to dial to
   * @param {String} protocolName, the protocol name /echo/1.0.1
   * @param {Function} onConnection receives (err,connection) =>{}
   */
  dialProtocol(peerInfo, protocolName, onConnection) {
    if (peerInfo.id.toB58String() === this.getSelfIdB58Str()) {
      this._logger.error("[-] Error : " + MSG_STATUS.ERR_SELF_DIAL);
    } else {
      this.node.dialProtocol(peerInfo, protocolName, onConnection);
    }
  }
  /**
   * Dial at some protocol and delegate the handling of that connection
   * @param {PeerInfo} peerInfo ,  the peer we wish to dial to
   * @param {Function} onConnection receives (err,connection) =>{}
   */
  dial(peerInfo, onConnection) {
    if (peerInfo.id.toB58String() === this.getSelfIdB58Str()) {
      this._logger.error("[-] Error : " + MSG_STATUS.ERR_SELF_DIAL);
    } else {
      this.node.dial(peerInfo, onConnection);
    }
  }
  /**
   * Dial once send a request, receive a response
   * @param {PeerInfo} peerInfo
   * @param {string} protocolName,
   * @param {JSON} reqMsg - request
   * @return {Promise<JSON>} response
   * */
  oneShotDial(peerInfo, protocolName, reqMsg) {
    return new Promise((resolve, reject) => {
      if (peerInfo.id.toB58String() === this.getSelfIdB58Str()) {
        reject(new errors.P2PErr(MSG_STATUS.ERR_SELF_DIAL));
      } else {
        this.node.dialProtocol(peerInfo, protocolName, (err, connection) => {
          if (err) {
            return reject(err);
          }
          pull(
            pull.values([reqMsg]),
            connection,
            pull.collect((err, responseMsg) => {
              if (err) {
                return reject(err);
              }
              return resolve(responseMsg);
            })
          );
        });
      }
    });
  }
  /**
   * Dial once send a request, receive a response and hang up - disconnect.
   * @param {PeerInfo} peerInfo
   * @param {string} protocolName,
   * @param {JSON} reqMsg - request
   * @return {Promise<JSON>} response
   * */
  async oneShotDialAndClose(peerInfo, protocolName, reqMsg) {
    let response = null;
    return new Promise(async (resolve, reject) => {
      try {
        response = await this.oneShotDial(peerInfo, protocolName, reqMsg);
      } catch (e) {
        this._logger.error(`[oneShotDialClose] on protocol ${protocolName}`);
        reject(e);
      } finally {
        // drop connection
        this.node.hangUp(peerInfo, err => {
          if (err) {
            reject(err);
          }
          resolve(response);
        });
      }
    });
  }
  /** Dial to a bootstrap node.
   * @param {PeerInfo} peerInfo, the peer to dial to
   * @return {boolean} true in a success, false otherwise
   */
  async connectToBootstrap(peerInfo) {
    const dial = promisify(this.dial).bind(this);
    try {
      await dial(peerInfo);
    } catch (connectionErr) {
      this._logger.error(`Failed connecting to a bootstrap node= ${connectionErr}`);
      return false;
    }

    this.notify(peerInfo);
    return true;
  }
  /**
   * Notify observer (Some controller subscribed)
   * @param {JSON} params, MUST CONTAIN notification field
   */
  notify(params) {
    this.emit("notify", params);
  }
  /**
   * Post a findpeers msg protocol request to another peer
   * @param {PeerInfo} peerInfo, the target peer
   * @param {Function} onResult signature (err,findPeersRequest, findPeersResponse) =>{}
   * @param {Integer} maxPeers , maximal number of peers
   * @return {Function}
   */
  findPeers(peerInfo, onResult, maxPeers) {
    if (peerInfo.id.toB58String() === this.getSelfIdB58Str()) {
      return onResult(MSG_STATUS.ERR_SELF_DIAL, null, null);
    }
    this.dialProtocol(peerInfo, PROTOCOLS.FIND_PEERS, (connErr, connection) => {
      if (connErr) {
        this._logger.error("[-] err connection to peer");
        return onResult(connErr, null);
      }

      // create findpeers msg
      const findPeersReq = new Messages.FindPeersReqMsg({
        from: this.getSelfIdB58Str(),
        to: peerInfo.id.toB58String(),
        maxpeers: maxPeers
      });

      if (!findPeersReq.isValidMsg()) {
        this._logger.error("[-] err creating findpeer request msg.");
        return onResult(new errors.P2PErr("err creating findpeer request msg."), null);
      }
      // post msg
      pull(
        pull.values([findPeersReq.toNetworkStream()]),
        connection,
        pull.collect((err, response) => {
          if (err) {
            this._logger.error("[-] err parsing findpeers response msg.");
            return onResult(err, null);
          }
          const findPeersResponseMsg = nodeUtils.toFindPeersResMsg(response);
          // validate the msg (same id as request, structure etc)
          if (!findPeersResponseMsg.isCompatibleWithMsg(findPeersReq)) {
            this._logger.error("[-] err parsing findpeers response msg.");
            return onResult(new errors.P2PErr("Invalid find peers response msg"), null);
          }
          onResult(null, findPeersReq, findPeersResponseMsg);
        })
      );
    });
  }
  /** provide content by declaring existing CID to the network
   * @param {EngCID} engCid , content cid wrapped in Enigma cid
   * @param {Function} callback - (err,engCid) =>{}
   */
  provideContent(engCid, callback) {
    if (!this.started) {
      throw new errors.InitPipelinesErr("Please start the Worker before providing content");
    }
    if (engCid) {
      const cid = engCid.getCID();
      this.node.contentRouting.provide(cid, err => {
        callback(err, engCid);
      });
    }
  }
  /**
   * given id lookup a peer in the network
   * does not attempt to connect
   * @param {string} b58Id
   * @return {Promise<PeerInfo>} peerInfo
   * */
  async lookUpPeer(b58Id) {
    return new Promise((resolve, reject) => {
      let peerId = nodeUtils.b58ToPeerId(b58Id);
      if (!peerId) {
        reject(new errors.TypeErr(`cant generate PeerId from ${b58Id}`));
      }
      this.node.peerRouting.findPeer(peerId, (err, peer) => {
        if (err) reject(err);
        else {
          resolve(peer);
        }
      });
    });
  }
  /**
   * get the local state of a remote peer
   * if not connected already -> hang-up after message exchange
   * */
  getLocalStateOfRemote(peerInfo) {
    return new Promise(async (resolve, reject) => {
      if (!peerInfo instanceof PeerInfo) {
        reject(new errors.TypeErr(`peerInfo is not PeerInfo`));
      }
      let protocol = constants.PROTOCOLS.LOCAL_STATE_EXCHAGNE;
      let isConnected = this.isConnected(peerInfo.id.toB58String());
      let response = null;
      try {
        if (isConnected) {
          response = await this.oneShotDial(peerInfo, protocol, Buffer.from(this.getSelfIdB58Str()));
        } else {
          response = await this.oneShotDialAndClose(peerInfo, protocol, Buffer.from(this.getSelfIdB58Str()));
        }
        response = JSON.parse(response.toString("utf8").replace("\n", ""));
        resolve(response);
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * Find provider for some CID
   * @param {EngCID} engCid, the content cid
   * @param {Integer} timeout, in milliseconds before returning an error
   * @param {Function} callback, (err,providers)=>{} , providers is {PeerInfo}
   */
  findContentProvider(engCid, timeout, callback) {
    const cid = engCid.getCID();
    const options = { maxTimeout: timeout };
    this.node.contentRouting.findProviders(cid, options, (err, providers) => {
      callback(err, providers);
    });
  }
  /** start the channel  - STATE_SYNC_REQ
   * @param {peerInfo} peerInfo
   * @param {Function} connectionHandler (protocol,connection) =>{}
   */
  startStateSyncRequest(peerInfo, connectionHandler) {
    this.dialProtocol(peerInfo, PROTOCOLS.STATE_SYNC, (protocol, connection) => {
      connectionHandler(protocol, connection);
    });
  }
  /** Send a heart-beat to some peer
   * @param {peerInfo} peerInfo, could be string b58 id as well
   * @param {HeartBeatReq} heartBeatRequest , the request
   * @param {Function} onResult
   * @promise Heartbeat result
   */
  sendHeartBeat(peerInfo, heartBeatRequest, onResult) {
    this.dialProtocol(peerInfo, PROTOCOLS["HEARTBEAT"], (protocol, conn) => {
      pull(
        pull.values([heartBeatRequest.toNetworkStream()]),
        conn,
        pull.collect((err, response) => {
          if (err) {
            // TODO:: add Logger
            this._logger.error("[-] Err in collecting HBRes msg" + err);
            onResult(err, null);
          } else {
            // validate HeartBeat Message response
            const heartBeatRes = nodeUtils.toHeartBeatResMsg(response);
            if (heartBeatRes.isCompatibleWithMsg(heartBeatRequest)) {
              // TODO:: validate ID equals in response, valid connection (possibly do nothing)
              onResult(null, heartBeatRes);
            } else {
              // TODO:: The heartbeat message failed (weird) why? wrong id?
              // TODO:: anyway, drop the message and do something in response.
              // TODO:: maybe drop the peer (?)
              // TODO:: add Logger
              onResult(err, null);
            }
          }
        })
      );
    });
  }
}

module.exports = EnigmaNode;
