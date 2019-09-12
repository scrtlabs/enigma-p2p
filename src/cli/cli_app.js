#!/usr/bin/env node
const main = require('../index');
const path = require('path');
const readline = require('readline');
const yargs = require('yargs');
const Parsers = require('./Parsers');
const nodeUtils = main.Utils.nodeUtils;
const EnviornmentBuilder = main.Builder;
const CoreServer = require('../core/core_server_mock/core_server');
const cryptography = main.cryptography;
const DbUtils = main.Utils.dbUtils;
const tempdir = require('tempdir');


const log = console;

// TODO:: add to manager events with spinner link below
// https://github.com/codekirei/node-multispinner/blob/master/extras/examples/events.js
// const Multispinner = require('multispinner')
// const spinners = ['core-alive', 'bootstrap-nodes', 'discover-optimal-dht','init-background-services' ,'synchronize-worker-state','init '];

class CLI {
  constructor() {
    // mock server
    this._mockCore = false;
    this._coreAddressPort = null;
    // tasks random path db
    this._randomTasksDbPath = null;
    // Ethereum stuff
    this._initEthereum = false;
    this._enigmaContractAddress = null;
    this._ethereumWebsocketProvider = null;
    this._ethereumAddress = null;
    this._autoInit = false;
    this._depositValue = null;

    this._principalNode = null;

    this._B1Path = path.join(__dirname, '../../test/testUtils/id-l');
    this._B1Port = '10300';
    this._B2Path = path.join(__dirname, '../../test/testUtils/id-d');
    this._B2Port = '10301';
    this._B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    this._B2Addr = '/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';

    this._configObject = {
      'bootstrapNodes': null,
      'port': null,
      'nickname': null,
      'idPath': null,
    };

    this._changedKeys = [];

    this._globalWrapper = {
      B1Addr: this._B1Addr,
      B2Addr: this._B2Addr,
      B1Port: this._B1Port,
      B2Port: this._B2Port,
      B1Path: this._B1Path,
      B2Path: this._B2Path,
      configObject: this._configObject,
      changedKeys: this._changedKeys,
    };

    this._node = null;
    this._mainController = null;
    this._commands = {
      'init': (args) => {
        const amount = args[1];
        this._node.initializeWorkerProcess(amount, (err) => {
          if (err) {
            log.info('[-] ERROR $init ', err);
          }
          const uri = 'https://github.com/enigmampc/enigma-p2p/blob/master/docs/ARCHITECTURE.md#overview-on-start';
          log.info('----------------------- ATTENTION --------------------------');
          log.info('please visit %s for more info', uri);
        });
      },
      'addPeer': (args) => {
        const ma = args[1];
        this._node.addPeer(ma);
      },
      'lookup': async (args) => {
        const b58Addr = args[1];
        const peerInfo = await this._node.lookUpPeer(b58Addr);
        log.info(`--------------> PeerInfo ${b58Addr} Lookup <--------------`);
        if (peerInfo) {
          log.info('Listening on:');
          peerInfo.multiaddrs.forEach((ma) => log.info(ma.toString()));
        } else {
          log.info('Not Found');
        }
      },
      'remoteTips': async (args) => {
        const b58Addr = args[1];
        const tips = await this._node.getLocalStateOfRemote(b58Addr);
        log.info(`--------------> tips of  ${b58Addr} Lookup <--------------`);
        if (tips) {
          tips.forEach((tip) => {
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            log.info(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          log.info(`-> total of ${tips.length} secret contracts.`);
        } else {
          log.info('Not Found');
        }
      },
      'getAddr': () => {
        const addrs = this._node.getSelfAddrs();
        log.info('---> self addrs : <---- ');
        log.info(addrs);
        log.info('>------------------------<');
      },
      'getOutConnections': () => {
        const cons = this._node.getAllOutboundHandshakes();
        log.info('---> outbound connections <---');
        cons.forEach((con) => {
          log.info(con.id.toB58String());
        });
        log.info('>------------------------<');
      },
      'getInConnections': () => {
        const cons = this._node.getAllInboundHandshakes();
        log.info('---> inbound connections <---');
        cons.forEach((con) => {
          log.info(con.id.toB58String());
        });
        log.info('>------------------------<');
      },
      'peerBank': () => {
        const peers = this._node.getAllPeerBank();
        log.info('peer bank: ');
        for (let k = 0; k < peers.lentgh; k++) {
          log.info(k);
        }
        log.info('>------------------------<');
      },
      'discover': () => {
        this._node.tryConsistentDiscovery();
      },
      'inCount': () => {
        const cons = this._node.getAllInboundHandshakes();
        log.info('---> inbound connections <---');
        log.info(cons.length);
        log.info('>------------------------<');
      },
      'outCount': () => {
        const cons = this._node.getAllOutboundHandshakes();
        log.info('---> outbound connections <---');
        log.info(cons.length);
        log.info('>------------------------<');
      },
      'broadcast': (args) => {
        const msg = args[1];
        this._node.broadcast(msg);
      },
      'announce': () => {
        this._node.tryAnnounce();
      },
      'identify': () => {
        this._node.identifyMissingStates();
      },
      'sync': () => {
        this._node.syncReceiverPipeline();
      },
      'monitorSubscribe': (args) => {
        if (args.length < 2) {
          return log.info('error please use $monitorSubscribe <topic str name>');
        }
        const topic = args[1];
        this._node.monitorSubscribe(topic);
      },
      'publish': (args) => {
        if (args.length < 3) {
          return log.info('error please $publish <topic> <str msg>');
        }
        const topic = args[1];
        const message = args[2];
        this._node.publish(topic, JSON.stringify(message));
      },
      'selfSubscribe': (args) => {
        this._node.selfSubscribeAction();
      },
      'getRegistration': (args) => {
        this._node.getRegistrationParams((err, result) => {
          if (err) {
            log.info('err in getRegistration' + err);
          } else {
            const out = {};
            out.report = result.result.report;
            out.signature = result.result.signature;
            out.singingKey = result.result.signingKey;
            log.info(out);
          }
        });
      },
      'getAllHandshakedPeers': () => {
        const hsPeers = this._node.getAllHandshakedPeers();
        log.info(hsPeers);
        // res == FindPeersResMsg inside messages.js
        this._node.sendFindPeerRequest(hsPeers[0], (err, req, res) => {
          log.info('ok got response!!! ', res.peers().length);
          nodeUtils.peerBankSeedtoPeerInfo(res.peers()[0], (err, peerInfo) => {
            if (err) {
              log.info('ERR converting seed into peerInfo', err);
            } else {
              this._node.sendFindPeerRequest(peerInfo, (err, req, res) => {
                if (err) {
                  log.info('error connecting to the seed peer! ', err);
                } else {
                  log.info('success connecting to the seed peer, his seeds len : ' + res.peers().length);
                }
              });
            }
          });
        });
      },
      'isConnected': (args) => {
        const id = args[1];
        this._node.isSimpleConnected(id);
      },
      'topics': async (args) => {
        const list = await this._node.getTopics();
        log.info('----> topics <-----');
        list.forEach((t) => {
          log.info(t);
        });
      },
      'tips': async (args) => {
        log.info('----------------> local tips <----------------');
        try {
          // addr -> index + hash
          const tips = await this._node.getLocalTips();
          tips.forEach((tip) => {
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            log.info(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          log.info(`-> total of ${tips.length} secret contracts.`);
        } catch (e) {
          log.info(e);
        }
      },
      'unsubscribe': async (args) => {
        const topic = args[1];
        this._node.unsubscribeTopic(topic);
      },
      'getResult': async (args) => {
        const taskId = args[1];
        const result = await this._node.getTaskResult(taskId);
        log.info(`-------------> Result for ${taskId} <-------------`);
        log.info(result);
        log.info(`>----------------------------------------------<`);
      },
      'register': async () => {
        await this._node.register();
      },
      'login': async () => {
        await this._node.login();
      },
      'logout': async () => {
        await this._node.logout();
      },
      'deposit': async (args) => {
        const amount = args[1];
        await this._node.deposit(amount);
      },
      'withdraw': async (args) => {
        const amount = args[1];
        await this._node.withdraw(amount);
      },
      'help': (args) => {
        log.info('---> Commands List <---');
        log.info('addPeer <address> : connect to a new peer manualy.');
        log.info('announce : announce the network worker synchronized on states');
        log.info('broadcast <message> : broadcast a message to the whole network');
        log.info('deposit <amount>: deposit to Enigma contract');
        log.info('discover : perform persistent discovery to reach optimal DHT');
        log.info('getAddr : get the multiaddress of the node. ');
        log.info('getInConnections : get list of the inbound connections ');
        log.info('getOutConnections : get id list of the outbound connections ');
        log.info('getRegistration : get the registration params of the node. ');
        log.info('getResult <taskId>: check locally if task result exists');
        log.info('help : help');
        log.info('identify : output to std all the missing state, i.e what needs to be synced');
        log.info('inCount : number of inbound connections');
        log.info('init : init all the required steps for the worker');
        log.info('isConnected <PeerId>: check if some peer is connected');
        log.info('login : login to Enigma contract');
        log.info('logout : logout from Enigma contract');
        log.info('lookup <b58 address> : lookup a peer in the network');
        log.info('monitorSubscribe <topic name> : subscribe to any event in the network and print to std every time there is a publish');
        log.info('outCount : number of outbound connections');
        log.info('peerBank : get list of the potential (not connected) seeds');
        log.info('publish <topic> <str msg> : publish <str msg> on topic <topic> to the network');
        log.info('register : register to Enigma contract');
        log.info('remoteTips <b58 address> : look up the tips of some remote peer');
        log.info('selfSubscribe : subscribe to self sign key, listen to publish events on that topic (for jsonrpc)');
        log.info('sync : sync the worker from the network and get all the missing states');
        log.info('tips : output to std the local existing states, tips');
        log.info('topics : list of subscribed topics');
        log.info('withdraw <amount>: withdraw from Enigma contract');
        log.info('>------------------------<');
      },
    };
    this._initInitialFlags();
    this._initEnvironment();
  }
  _initInitialFlags() {
    yargs
        .env(true) // Take environment variables too
        .version('0.1.0')
        .option('b', {
          alias: 'bnodes',
          describe: 'Bootstrap nodes',
          type: 'string',
          coerce: (listVal) => Parsers.list(listVal, this._globalWrapper),
        })
        .option('n', {
          alias: 'nickname',
          describe: 'nickname',
          type: 'string',
          coerce: (nick) => Parsers.nickname(nick, this._globalWrapper),
        })
        .option('p', {
          alias: 'port',
          describe: 'listening port',
          type: 'string',
          coerce: (strPort) => Parsers.port(strPort, this._globalWrapper),
        })
        .option('i', {
          alias: 'idpath',
          describe: 'id path',
          type: 'string',
          coerce: (theIdPath) => Parsers.idPath(theIdPath, this._globalWrapper),
        })
        .option('c', {
          alias: 'core',
          describe: 'specify address:port of core',
          type: 'string',
          coerce: (addrPortStr) => {
            this._coreAddressPort = addrPortStr;
          },
        })
        .option('mc', {
          alias: 'mock-core',
          describe: '[TEST] start with core mock server. Must be used with --core option',
          type: 'boolean',
          coerce: () => {
            this._mockCore = true;
          },
        })
        .option('rdb', {
          alias: 'random-db',
          describe: 'random tasks db',
          default: '', // Must be set so the coerce function will always run
          type: 'string',
          coerce: (randomPath) => {
            if (randomPath) {
              this._randomTasksDbPath = randomPath;
            } else {
              this._randomTasksDbPath = true;
            }
          },
        })
        .option('a', {
          alias: 'proxy',
          describe: 'specify port and start with proxy feature (client jsonrpc api)',
          type: 'string',
          coerce: (portStr) => {
            this._rpcPort = portStr;
          },
        })
        .option('ewp', {
          alias: 'ethereum-websocket-provider',
          describe: 'specify the Ethereum websocket provider',
          type: 'string',
          coerce: (provider) => {
            this._initEthereum = true;
            this._ethereumWebsocketProvider = provider;
          },
        })
        .option('eca', {
          alias: 'ethereum-contract-address',
          describe: 'specify the Enigma contract address to start with',
          type: 'string',
          coerce: (address) => {
            this._initEthereum = true;
            this._enigmaContractAddress = address;
          },
        })
        .option('E', {
          alias: 'init-ethereum',
          describe: 'init Ethereum',
          type: 'boolean',
          coerce: () => {
            this._initEthereum = true;
          },
        })
        .option('ea', {
          alias: 'ethereum-address',
          describe: 'specify the Ethereum wallet address',
          type: 'string',
          coerce: (address) => {
            this._initEthereum = true;
            this._ethereumAddress = address;
          },
        })
        .option('pn', {
          alias: 'principal-node',
          describe: 'specify the address:port of the Principal Node',
          type: 'string',
          coerce: (addrPortstr) => {
            this._principalNode = addrPortstr;
          },
        })
        .option('ai', {
          alias: 'auto-init',
          describe: 'perform automatic worker initialization',
          type: 'boolean',
          coerce: () => {
            this._autoInit = true;
          },
        })
        .option('dal', {
          alias: 'deposit-and-login',
          describe: 'deposit and login the worker, specify the amount to be deposited, while running automatic initialization',
          type: 'string',
          coerce: (value) => {
            this._autoInit = true;
            this._depositValue = value;
          },
        })
        .argv;
  }
  _getFinalConfig() {
    const finalConfig = {};
    this._changedKeys.forEach((key) => {
      finalConfig[key] = this._configObject[key];
    });
    return finalConfig;
  }
  async _initEnvironment() {
    const builder = new EnviornmentBuilder();
    if (this._coreAddressPort) {
      const uri = 'tcp://' + this._coreAddressPort;
      if (this._mockCore) {
        const coreServer = new CoreServer();
        coreServer.setProvider(true);
        coreServer.runServer(uri);
      }
      builder.setIpcConfig({uri: uri});
    }
    if (this._rpcPort) {
      builder.setJsonRpcConfig({
        port: parseInt(this._rpcPort),
        peerId: null,
      });
    }
    /** init Ethereum API
     * */
    if (this._initEthereum) {
      builder.setEthereumConfig({
        ethereumUrlProvider: this._ethereumWebsocketProvider,
        enigmaContractAddress: this._enigmaContractAddress,
        ethereumAddress: this._ethereumAddress,
      });
    }
    const nodeConfig = this._getFinalConfig();
    if (this._randomTasksDbPath || this._principalNode) {
      if (this._principalNode) {
        log.info('Connecting to Principal Node at ' + this._principalNode);
        nodeConfig.extraConfig = {principal: {uri: this._principalNode}};
      } else {
        nodeConfig.extraConfig = {};
      }
      nodeConfig.extraConfig.tm = {
        dbPath: tempdir.sync(),
      };
    }
    this._mainController = await builder.setNodeConfig(nodeConfig).build();
    this._node = this._mainController.getNode();
    const n = this._node;
    process.on('SIGINT', async function() {
      log.info('----> closing gracefully <------');
      await n.stop();
      process.exit();
    });

    this._setup();
  }
  _setup() {
    if (this._autoInit) {
      this._node.initializeWorkerProcess(this._depositValue, (err) => {
        if (err) {
          log.info('[-] ERROR with automatic worker initialization: ', err);
        }
      });
    }
  }
  start() {
    log.info(Parsers.opener);
    const cmds = this._commands;
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    }).on('line', function(cmd) {
      const args = cmd.split(' ');
      if (cmds[args[0]]) {
        cmds[args[0]](args);
      } else {
        log.info('XXX no such command XXX ');
      }
    });
    return this;
  }
}
// TODO:: the CLI starts automatically for now, also called from server.js (includes this file)
new CLI().start();

module.exports = CLI;
