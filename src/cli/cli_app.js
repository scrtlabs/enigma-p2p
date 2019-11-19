#!/usr/bin/env node
const main = require('../index');
const path = require('path');
const readline = require('readline');
const program = require('commander');
const Parsers = require('./Parsers');
const EnviornmentBuilder = main.Builder;
const CoreServer = require('../core/core_server_mock/core_server');
const cryptography = main.cryptography
const DbUtils = main.Utils.dbUtils;
const tempdir = require('tempdir');
const utils = require('../common/utils');

//TODO:: add to manager events with spinner link below
//https://github.com/codekirei/node-multispinner/blob/master/extras/examples/events.js
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
    this._enigmaContractAbiPath = null;
    this._ethereumWebsocketProvider = null;
    this._ethereumKeyPath = null;
    this._ethereumKey = null;
    this._ethereumAddress = null;
    this._autoInit = false;
    this._depositValue = null;
    this._isLonelyNode = false;

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
      'init': async (args)=>{
        const amount = args[1];
        try {
          await this._node.asyncInitializeWorkerProcess({amount: amount});
        }
        catch (err) {
          console.log('[-] ERROR $init ', err);
        }
      },
      'addPeer': (args)=>{
        const ma = args[1];
        this._node.addPeer(ma);
      },
      'lookup': async (args)=>{
        const b58Addr = args[1];
        let peerInfo = await this._node.lookUpPeer(b58Addr);
        console.log(`--------------> PeerInfo ${b58Addr} Lookup <--------------`);
        if(peerInfo){
          console.log("Listening on:");
          peerInfo.multiaddrs.forEach((ma)=> console.log(ma.toString()));
        }else{
          console.log("Not Found");
        }
      },
      'remoteTips': async (args)=>{
        const b58Addr = args[1];
        let tips = await this._node.getLocalStateOfRemote(b58Addr);
        console.log(`--------------> tips of  ${b58Addr} Lookup <--------------`);
        if(tips){
          tips.forEach((tip)=>{
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            console.log(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          console.log(`-> total of ${tips.length} secret contracts.`);
        }else{
          console.log("Not Found");
        }
      },
      'getAddr': ()=>{
        const addrs = this._node.getSelfAddrs();
        console.log('---> self addrs : <---- ');
        console.log(addrs);
        console.log('>------------------------<');
      },
      'getConnectedPeers': () =>{
        const peers = this._node.getConnectedPeers();
        console.log('getConnectedPeers: ', peers);
        console.log('>------------------------<');
      },
      'broadcast': (args) =>{
        const msg = args[1];
        this._node.broadcast(msg);
      },
      'announce': ()=>{
        this._node.tryAnnounce();
      },
      'identify': ()=>{
        this._node.identifyMissingStates();
      },
      'sync': ()=>{
        this._node.syncReceiverPipeline();
      },
      'monitorSubscribe': (args)=>{
        if (args.length < 2 ) {
          return console.log('error please use $monitorSubscribe <topic str name>');
        }
        const topic = args[1];
        this._node.monitorSubscribe(topic);
      },
      'publish': (args) =>{
        if (args.length <3) {
          return console.log('error please $publish <topic> <str msg>');
        }
        const topic = args[1];
        const message = args[2];
        this._node.publish(topic, JSON.stringify(message));
      },
      'selfSubscribe': (args)=>{
        this._node.selfSubscribeAction();
      },
      'getRegistration': (args)=>{
        this._node.getRegistrationParams((err, result)=>{
          if (err) {
            console.log('err in getRegistration' + err);
          } else {
            const out = {};
            out.report = result.result.report;
            out.signature = result.result.signature;
            out.singingKey = result.result.signingKey;
            console.log(out);
          }
        });
      },
      'isConnected': (args)=>{
        const id = args[1];
        const isConnected = this._node.isConnected(id);
        console.log('Connection test : ' + id + ' ? ' + isConnected);
      },
      'topics': async (args)=>{
        const list = await this._node.getTopics();
        console.log('----> topics <-----');
        list.forEach((t)=>{
          console.log(t);
        });
      },
      'tips': async (args)=>{
        console.log('----------------> local tips <----------------');
        try {
          // addr -> index + hash
          const tips = await this._node.getLocalTips();
          tips.forEach((tip)=>{
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            console.log(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          console.log(`-> total of ${tips.length} secret contracts.`);
        } catch (e) {
          console.log(e);
        }
      },
      'unsubscribe': async (args)=>{
        const topic = args[1];
        this._node.unsubscribeTopic(topic);
      },
      'getResult' : async (args)=>{
        const taskId = args[1];
        let result = await this._node.getTaskResult(taskId);
        console.log(`-------------> Result for ${taskId} <-------------`);
        console.log(result);
        console.log(`>----------------------------------------------<`);
      },
      'register' : async ()=>{
        await this._node.register();
      },
      'login' : async ()=>{
        await this._node.login();
      },
      'logout' : async ()=>{
        await this._node.logout();
      },
      'deposit' : async (args)=>{
        const amount = args[1];
        await this._node.deposit(amount);
      },
      'withdraw' : async (args)=>{
        const amount = args[1];
        await this._node.withdraw(amount);
      },
      'help': (args)=>{
        console.log('---> Commands List <---');
        console.log('addPeer <address> : connect to a new peer manualy.');
        console.log('announce : announce the network worker synchronized on states');
        console.log('broadcast <message> : broadcast a message to the whole network');
        console.log('deposit <amount>: deposit to Enigma contract');
        console.log('getAddr : get the multiaddress of the node. ');
        console.log('getConnectedPeers : get the list of connected peer Ids');
        console.log('getRegistration : get the registration params of the node. ');
        console.log('getResult <taskId>: check locally if task result exists');
        console.log('help : help');
        console.log('identify : output to std all the missing state, i.e what needs to be synced');
        console.log('init : init all the required steps for the worker');
        console.log('isConnected <PeerId>: check if some peer is connected');
        console.log('login : login to Enigma contract');
        console.log('logout : logout from Enigma contract');
        console.log('lookup <b58 address> : lookup a peer in the network');
        console.log('monitorSubscribe <topic name> : subscribe to any event in the network and print to std every time there is a publish');
        console.log('publish <topic> <str msg> : publish <str msg> on topic <topic> to the network')
        console.log('register : register to Enigma contract');
        console.log('remoteTips <b58 address> : look up the tips of some remote peer');
        console.log('selfSubscribe : subscribe to self sign key, listen to publish events on that topic (for jsonrpc)');
        console.log('sync : sync the worker from the network and get all the missing states');
        console.log('tips : output to std the local existing states, tips');
        console.log('topics : list of subscribed topics');
        console.log('withdraw <amount>: withdraw from Enigma contract');
        console.log('>------------------------<');
      },
    };
    this._initInitialFlags();
    this._initEnvironment();
  }
  _initInitialFlags() {
    program
    .version('0.1.0')
    .usage('[options] <file ...>')
    .option('-b, --bnodes <items>', 'Bootstrap nodes', (listVal)=>{
      Parsers.list(listVal, this._globalWrapper);
    })
    .option('-n, --nickname [value]', 'nickname', (nick)=>{
      Parsers.nickname(nick, this._globalWrapper);
    })
    .option('-p, --port [value]', 'listening port', (strPort)=>{
      Parsers.port(strPort, this._globalWrapper);
    })
    .option('-i, --path [value]', 'id path', (theIdPath)=>{
      Parsers.idPath(theIdPath, this._globalWrapper);
    })
    .option('-c, --core [value]', 'specify address:port of core', (addrPortStr)=>{
      this._coreAddressPort = addrPortStr;
    })
    .option('--mock-core', '[TEST] start with core mock server. Must be used with --core option', ()=>{
        this._mockCore = true;
    })
    .option('--random-db', 'random tasks db', (randomPath)=>{
      if (randomPath) {
        this._randomTasksDbPath = randomPath;
      } else {
        this._randomTasksDbPath = true;
      }
    })
    .option('-a, --proxy [value]', 'specify port and start with proxy feature (client jsonrpc api)', (portStr)=>{
      this._rpcPort = portStr;
    })
    .option('--ethereum-websocket-provider [value]', 'specify the Ethereum websocket provider', (provider)=>{
      this._initEthereum = true;
      this._ethereumWebsocketProvider = provider;
    })
    .option('--ethereum-contract-address [value]', 'specify the Enigma contract address to start with', (address)=>{
      this._initEthereum = true;
      this._enigmaContractAddress = address;
    })
    .option('--ethereum-contract-abi-path [value]', 'specify the Enigma contract ABI path', (path)=>{
      this._initEthereum = true;
      this._enigmaContractAbiPath = path;
    })
    .option('-E, --init-ethereum', 'init Ethereum', ()=>{
      this._initEthereum = true;
    })
    .option('--ethereum-address [value]', 'specify the Ethereum public address', (address)=>{
      this._initEthereum = true;
      this._ethereumAddress = address;
    })
    .option('--ethereum-key-path [value]', 'specify the Ethereum key path', (path)=>{
      this._initEthereum = true;
      this._ethereumKeyPath = path;
    })
    .option('--ethereum-key [value]', 'specify the Ethereum key', (key)=>{
      this._initEthereum = true;
      this._ethereumKey = key;
    })
    .option('--principal-node [value]', 'specify the address:port of the Principal Node', (addrPortstr)=>{
      this._principalNode = addrPortstr;
    })
    .option('--auto-init', 'perform automatic worker initialization ', ()=>{
      this._autoInit = true;
    })
    .option('--lonely-node', 'is it the only node in a system', ()=>{
      this._isLonelyNode = true;
    })
    .option('--deposit-and-login [value]', 'deposit and login the worker, specify the amount to be deposited, while running automatic initialization', (value)=>{
      this._autoInit = true;
      this._depositValue = value;
    })
    .parse(process.argv);
  }
  _getFinalConfig() {
    const finalConfig = {};
    this._changedKeys.forEach((key)=>{
      finalConfig[key] = this._configObject[key];
    });
    return finalConfig;
  }
  async _initEnvironment() {
    const builder = new EnviornmentBuilder();
    if (this._coreAddressPort) {
      const uri ='tcp://' + this._coreAddressPort;
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
      let enigmaContractAbi = null;
      let accountKey = this._ethereumKey;
      if (this._enigmaContractAbiPath) {
        try {
          let raw = await utils.readFile(this._enigmaContractAbiPath);
          enigmaContractAbi = JSON.parse(raw).abi;
        }
        catch(e) {
          console.log(`Error in reading enigma contract API ${this._enigmaContractAbiPath}`);
          return;
        }
      }
      if (this._ethereumKeyPath) {
        try {
          accountKey = await utils.readFile(this._ethereumKeyPath);
        }
        catch(e) {
          console.log(`Error in reading account key ${this._ethereumKeyPath}`);
          return;
        }
      }
      builder.setEthereumConfig({
        urlProvider: this._ethereumWebsocketProvider,
        enigmaContractAddress: this._enigmaContractAddress,
        accountAddress: this._ethereumAddress,
        enigmaContractAbi,
        accountKey
      });
    }
    const nodeConfig = this._getFinalConfig();
    nodeConfig.extraConfig = {};

    if (this._randomTasksDbPath || this._principalNode) {
      if (this._principalNode) {
        console.log('Connecting to Principal Node at ' + this._principalNode);
        nodeConfig.extraConfig = {principal: {uri: this._principalNode}}
      }
      nodeConfig.extraConfig.tm = {
        dbPath: tempdir.sync()
      };
    }
    if (this._autoInit) {
      nodeConfig.extraConfig.init = {amount: this._depositValue};
    }
    this._mainController = await builder.setNodeConfig(nodeConfig).build();
    this._node = this._mainController.getNode();
    const n = this._node;
    process.on('SIGINT', async function() {
      console.log('----> closing gracefully <------');
      await n.stop();
      process.exit();
    });

    let err = await this._setup();
    if (err) {
      process.exit();
    }
  }
  async _setup() {
    // TODO: consider what to do with this!!!
    // The reason it is here to handle the case of one node in the system (mainly for testing purposes)
    if (this._autoInit && this._isLonelyNode) {
      this._node.initializeWorkerProcess(this._depositValue, (err)=>{
        if (err) {
          console.log('[-] ERROR with automatic worker initialization: ', err);
        }
      });
    }
  }
  start() {
    console.log(Parsers.opener);
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
        console.log('XXX no such command XXX ');
      }
    });
    return this;
  }
}
// TODO:: the CLI starts automatically for now
const cli = new CLI().start();

module.exports = CLI;
