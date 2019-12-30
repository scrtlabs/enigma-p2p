#!/usr/bin/env node
const main = require("../index");
const path = require("path");
const readline = require("readline");
const program = require("commander");
const Parsers = require("./Parsers");
const EnviornmentBuilder = main.Builder;
const CoreServer = require("../core/core_server_mock/core_server");
const cryptography = main.cryptography;
const DbUtils = main.Utils.dbUtils;
const tempdir = require("tempdir");
const utils = require("../common/utils");
const constants = require("../common/constants");

const log4js = require("log4js");
const logger = log4js.getLogger("cli");

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
    this._operationalKeyPath = null;
    this._operationalKey = null;
    this._operationalAddress = null;
    this._stakingAddress = null;

    this._autoInit = false;
    this._isLonelyNode = false;
    this._minConfirmations = null;
    this._principalNode = null;
    this._logLevel = "info";
    this._healthCheckPort = null;
    this._healthCheckUrl = null;
    this._statusUrl = null;

    this._B1Path = path.join(__dirname, "../../test/testUtils/id-l");
    this._B1Port = "10300";
    this._B2Path = path.join(__dirname, "../../test/testUtils/id-d");
    this._B2Port = "10301";
    this._B1Addr = "/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm";
    this._B2Addr = "/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP";

    this._configObject = {
      bootstrapNodes: null,
      port: null,
      nickname: null,
      idPath: null
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
      changedKeys: this._changedKeys
    };

    this._node = null;
    this._mainController = null;
    this._commands = {
      init: async args => {
        const amount = args[1];
        try {
          await this._node.asyncInitializeWorkerProcess({ amount: amount });
        } catch (err) {
          logger.info("[-] ERROR $init ", err);
        }
      },
      addPeer: args => {
        const ma = args[1];
        this._node.addPeer(ma);
      },
      lookup: async args => {
        const b58Addr = args[1];
        const peerInfo = await this._node.lookUpPeer(b58Addr);
        logger.info(`--------------> PeerInfo ${b58Addr} Lookup <--------------`);
        if (peerInfo) {
          logger.info("Listening on:");
          peerInfo.multiaddrs.forEach(ma => logger.info(ma.toString()));
        } else {
          logger.info("Not Found");
        }
      },
      remoteTips: async args => {
        const b58Addr = args[1];
        const tips = await this._node.getLocalStateOfRemote(b58Addr);
        logger.info(`--------------> tips of  ${b58Addr} Lookup <--------------`);
        if (tips) {
          tips.forEach(tip => {
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            logger.info(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          logger.info(`-> total of ${tips.length} secret contracts.`);
        } else {
          logger.info("Not Found");
        }
      },
      getAddr: () => {
        const addrs = this._node.getSelfAddrs();
        logger.info("---> self addrs : <---- ");
        logger.info(addrs);
        logger.info(">------------------------<");
      },
      getConnectedPeers: () => {
        const peers = this._node.getConnectedPeers();
        logger.info("getConnectedPeers: ", peers);
        logger.info(">------------------------<");
      },
      broadcast: args => {
        const msg = args[1];
        this._node.broadcast(msg);
      },
      announce: () => {
        this._node.tryAnnounce();
      },
      identify: () => {
        this._node.identifyMissingStates();
      },
      sync: () => {
        this._node.syncReceiverPipeline();
      },
      monitorSubscribe: args => {
        if (args.length < 2) {
          return logger.info("error please use $monitorSubscribe <topic str name>");
        }
        const topic = args[1];
        this._node.monitorSubscribe(topic);
      },
      publish: args => {
        if (args.length < 3) {
          return logger.info("error please $publish <topic> <str msg>");
        }
        const topic = args[1];
        const message = args[2];
        this._node.publish(topic, JSON.stringify(message));
      },
      selfSubscribe: args => {
        this._node.selfSubscribeAction();
      },
      getRegistration: args => {
        this._node.getRegistrationParams((err, result) => {
          if (err) {
            logger.info("err in getRegistration" + err);
          } else {
            const out = {};
            out.report = result.result.report;
            out.signature = result.result.signature;
            out.singingKey = result.result.signingKey;
            logger.info(out);
          }
        });
      },
      isConnected: args => {
        const id = args[1];
        const isConnected = this._node.isConnected(id);
        logger.info("Connection test : " + id + " ? " + isConnected);
      },
      topics: async args => {
        const list = await this._node.getTopics();
        logger.info("----> topics <-----");
        list.forEach(t => {
          logger.info(t);
        });
      },
      tips: async args => {
        logger.info("----------------> local tips <----------------");
        try {
          // addr -> index + hash
          const tips = await this._node.getLocalTips();
          tips.forEach(tip => {
            const deltaHash = cryptography.hash(tip.data);
            const hexAddr = DbUtils.toHexString(tip.address);
            logger.info(`address: ${hexAddr} => key: ${tip.key} hash: ${deltaHash}`);
          });
          logger.info(`-> total of ${tips.length} secret contracts.`);
        } catch (e) {
          logger.info(e);
        }
      },
      unsubscribe: async args => {
        const topic = args[1];
        this._node.unsubscribeTopic(topic);
      },
      getResult: async args => {
        const taskId = args[1];
        const result = await this._node.getTaskResult(taskId);
        logger.info(`-------------> Result for ${taskId} <-------------`);
        logger.info(result);
        logger.info(`>----------------------------------------------<`);
      },
      register: async () => {
        await this._node.register();
      },
      login: async () => {
        await this._node.login();
      },
      logout: async () => {
        await this._node.logout();
      },
      help: args => {
        logger.info("---> Commands List <---");
        logger.info("addPeer <address> : connect to a new peer manualy.");
        logger.info("announce : announce the network worker synchronized on states");
        logger.info("broadcast <message> : broadcast a message to the whole network");
        logger.info("getAddr : get the multiaddress of the node. ");
        logger.info("getConnectedPeers : get the list of connected peer Ids");
        logger.info("getRegistration : get the registration params of the node. ");
        logger.info("getResult <taskId>: check locally if task result exists");
        logger.info("help : help");
        logger.info("identify : output to std all the missing state, i.e what needs to be synced");
        logger.info("init : init all the required steps for the worker");
        logger.info("isConnected <PeerId>: check if some peer is connected");
        logger.info("login : login to Enigma contract");
        logger.info("logout : logout from Enigma contract");
        logger.info("lookup <b58 address> : lookup a peer in the network");
        logger.info(
          "monitorSubscribe <topic name> : subscribe to any event in the network and print to std every time there is a publish"
        );
        logger.info("publish <topic> <str msg> : publish <str msg> on topic <topic> to the network");
        logger.info("register : register to Enigma contract");
        logger.info("remoteTips <b58 address> : look up the tips of some remote peer");
        logger.info("selfSubscribe : subscribe to self sign key, listen to publish events on that topic (for jsonrpc)");
        logger.info("sync : sync the worker from the network and get all the missing states");
        logger.info("tips : output to std the local existing states, tips");
        logger.info("topics : list of subscribed topics");
        logger.info(">------------------------<");
      }
    };
    this._initInitialFlags();
    this._initEnvironment();
  }
  _initInitialFlags() {
    program
      .version("0.1.0")
      .usage("[options] <file ...>")
      .option("-b, --bnodes <items>", "Bootstrap nodes", listVal => {
        Parsers.list(listVal, this._globalWrapper);
      })
      .option("-n, --nickname [value]", "nickname", nick => {
        Parsers.nickname(nick, this._globalWrapper);
      })
      .option("-p, --port [value]", "listening port", strPort => {
        Parsers.port(strPort, this._globalWrapper);
      })
      .option("-i, --path [value]", "id path", theIdPath => {
        Parsers.idPath(theIdPath, this._globalWrapper);
      })
      .option("-c, --core [value]", "specify address:port of core", addrPortStr => {
        this._coreAddressPort = addrPortStr;
      })
      .option("--mock-core", "[TEST] start with core mock server. Must be used with --core option", () => {
        this._mockCore = true;
      })
      .option("--random-db", "random tasks db", randomPath => {
        if (randomPath) {
          this._randomTasksDbPath = randomPath;
        } else {
          this._randomTasksDbPath = true;
        }
      })
      .option("-a, --proxy [value]", "specify port and start with proxy feature (client jsonrpc api)", portStr => {
        this._rpcPort = portStr;
      })
      .option("--ethereum-websocket-provider [value]", "specify the Ethereum websocket provider", provider => {
        this._initEthereum = true;
        this._ethereumWebsocketProvider = provider;
      })
      .option("--ethereum-contract-address [value]", "specify the Enigma contract address to start with", address => {
        this._initEthereum = true;
        this._enigmaContractAddress = address;
      })
      .option("--ethereum-contract-abi-path [value]", "specify the Enigma contract ABI path", path => {
        this._initEthereum = true;
        this._enigmaContractAbiPath = path;
      })
      .option("-E, --init-ethereum", "init Ethereum", () => {
        this._initEthereum = true;
      })
      .option("--ethereum-address [value]", "specify the Ethereum public address", address => {
        this._initEthereum = true;
        this._operationalAddress = address;
      })
      .option("--ethereum-key-path [value]", "specify the Ethereum key path", path => {
        this._initEthereum = true;
        this._operationalKeyPath = path;
      })
      .option("--ethereum-key [value]", "specify the Ethereum key", key => {
        this._initEthereum = true;
        this._operationalKey = key;
      })
      .option("--principal-node [value]", "specify the address:port of the Principal Node", addrPortstr => {
        this._principalNode = addrPortstr;
      })
      .option("--auto-init", "perform automatic worker initialization ", () => {
        this._autoInit = true;
      })
      .option("--lonely-node", "is it the only node in a system", () => {
        this._isLonelyNode = true;
      })
      .option("--health [value]", "start a service for health check and status queries", port => {
        this._healthCheckPort = port;
      })
      .option("--health-url [value]", "define the health check queries url", url => {
        this._healthCheckUrl = url;
      })
      .option("--status-url [value]", "define the status queries url", url => {
        this._statusUrl = url;
      })
      .option("--logout-and-exit", "Log out and then exit", () => {
        this._logoutExit = true;
      })
      .option(
        "-l, --log-level <value>",
        "[Optional] Set the log level (default - info)",
        value => {
          this._logLevel = value;
        },
        "info"
      )
      .option(
        "--min-confirmations [value]",
        "the minimum number of confirmations (ethereum blocks) a worker has to wait before knowing data from ethereum is valid ",
        (minConfirmations = constants.MINIMUM_CONFIRMATIONS) => {
          this._minConfirmations = +minConfirmations;
        }
      )
      .option("--staking-address [value]", "specify the Ethereum staking public address", address => {
        this._initEthereum = true;
        this._stakingAddress = address;
      })
      .parse(process.argv);
  }
  _getFinalConfig() {
    const finalConfig = {};
    this._changedKeys.forEach(key => {
      finalConfig[key] = this._configObject[key];
    });
    return finalConfig;
  }
  async _initEnvironment() {
    const builder = new EnviornmentBuilder();
    if (this._coreAddressPort) {
      const uri = "tcp://" + this._coreAddressPort;
      if (this._mockCore) {
        const coreServer = new CoreServer();
        coreServer.runServer(uri);
      }
      builder.setIpcConfig({ uri: uri });
    }
    if (this._rpcPort) {
      builder.setJsonRpcConfig({
        port: parseInt(this._rpcPort),
        peerId: null
      });
    }

    builder.setLoggerConfig({ name: "MainController", level: this._logLevel });
    /** init Ethereum API
     * */
    if (this._initEthereum) {
      let enigmaContractAbi = null;
      let operationalKey = this._operationalKey;
      if (this._enigmaContractAbiPath) {
        try {
          const raw = await utils.readFile(this._enigmaContractAbiPath);
          enigmaContractAbi = JSON.parse(raw).abi;
        } catch (e) {
          logger.info(`Error in reading enigma contract API ${this._enigmaContractAbiPath}`);
          return;
        }
      }
      if (this._operationalKeyPath) {
        try {
          operationalKey = await utils.readFile(this._operationalKeyPath);
        } catch (e) {
          logger.info(`Error in reading account key ${this._operationalKeyPath}`);
          return;
        }
      }

      builder.setEthereumConfig({
        urlProvider: this._ethereumWebsocketProvider,
        enigmaContractAddress: this._enigmaContractAddress,
        operationalAddress: this._operationalAddress,
        enigmaContractAbi,
        operationalKey,
        minConfirmations: this._minConfirmations,
        stakingAddress: this._stakingAddress
      });
    }
    const nodeConfig = this._getFinalConfig();
    nodeConfig.extraConfig = {};

    if (this._randomTasksDbPath || this._principalNode) {
      if (this._principalNode) {
        logger.info("Connecting to Principal Node at " + this._principalNode);
        nodeConfig.extraConfig = { principal: { uri: this._principalNode } };
      }
      nodeConfig.extraConfig.tm = {
        dbPath: tempdir.sync()
      };
    }
    if (this._autoInit) {
      nodeConfig.extraConfig.init = { autoInit: true };
    }
    if (this._healthCheckPort || this._healthCheckUrl || this._statusUrl) {
      nodeConfig.extraConfig.webserver = {
        port: this._healthCheckPort,
        healthCheck: { url: this._healthCheckUrl },
        status: { url: this._statusUrl }
      };
    }
    this._mainController = await builder.setNodeConfig(nodeConfig).build();
    this._node = this._mainController.getNode();

    if (this._logoutExit) {
      await this._commands.logout();
      process.exit(0);
    }

    const gracefullShutDown = async err => {
      if (err) {
        logger.trace("----> received error <------");
        logger.trace(err);
      }
      process.exit(1);
    };

    const goodbyeMessage = async () => {
      logger.info("P2P Shutdown successfully");
    };

    // do something when app is closing
    process.on("exit", goodbyeMessage);

    // catches ctrl+c event
    process.on("SIGINT", gracefullShutDown);
    process.on("SIGHUP", gracefullShutDown);
    process.on("SIGTERM", gracefullShutDown);
    process.on("SIGQUIT", gracefullShutDown);

    // catches uncaught exceptions
    process.on("uncaughtException", gracefullShutDown);

    const err = await this._setup();
    if (err) {
      process.exit(1);
    }
  }
  async _setup() {
    // TODO: consider what to do with this!!!
    // The reason it is here to handle the case of one node in the system (mainly for testing purposes)
    if (this._autoInit && this._isLonelyNode) {
      this._node.initializeWorkerProcess(err => {
        if (err) {
          logger.info("[-] ERROR with automatic worker initialization: ", err);
        }
      });
    }
  }
  start() {
    logger.info("Welcome to Enigma P2P");
    const cmds = this._commands;
    readline
      .createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      })
      .on("line", function(cmd) {
        const args = cmd.split(" ");
        if (cmds[args[0]]) {
          cmds[args[0]](args);
        } else {
          logger.info("XXX no such command XXX ");
        }
      });
    return this;
  }
}
// TODO:: the CLI starts automatically for now
const cli = new CLI().start();

module.exports = CLI;
