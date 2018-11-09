const constants = require('../common/constants');
const path = require('path');
const readline = require('readline');
const program = require('commander');
const Parsers = require('./Parsers');
const nodeUtils = require('../common/utils');
const NodeController = require('../worker/controller/NodeController');
const EnviornmentBuilder = require('../main_controller/EnvironmentBuilder');

class CLI{
  constructor(){
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
      B1Addr : this._B1Addr,
      B2Addr : this._B2Addr,
      B1Port : this._B1Port,
      B2Port : this._B2Port,
      B1Path : this._B1Path,
      B2Path : this._B2Path,
      configObject : this._configObject,
      changedKeys : this._changedKeys
    };

    this._node = null;
    this._mainController = null;
    this._commands = {
      'addPeer': (args)=>{
        const ma = args[1];
        this._node.addPeer(ma);
      },
      'getAddr': ()=>{
        const addrs = this._node.getSelfAddrs();
        console.log('---> self addrs : <---- ');
        console.log(addrs);
        console.log('>------------------------<');
      },
      'getOutConnections': ()=>{
        const cons = this._node.getAllOutboundHandshakes();
        console.log('---> outbound connections <---');
        cons.forEach((con)=>{
          console.log(con.id.toB58String());
        });
        console.log('>------------------------<');
      },
      'getInConnections': ()=>{
        const cons = this._node.getAllInboundHandshakes();
        console.log('---> inbound connections <---');
        cons.forEach((con)=>{
          console.log(con.id.toB58String());
        });
        console.log('>------------------------<');
      },
      'peerBank': () =>{
        const peers = this._node.getAllPeerBank();
        console.log('peer bank: ');
        for (let k=0; k<peers.lentgh; k++) {
          console.log(k);
        }
        console.log('>------------------------<');
      },
      'discover': () =>{
        this._node.tryConsistentDiscovery();
      },
      'inCount': () =>{
        const cons = this._node.getAllInboundHandshakes();
        console.log('---> inbound connections <---');
        console.log(cons.length);
        console.log('>------------------------<');
      },
      'outCount': () =>{
        const cons = this._node.getAllOutboundHandshakes();
        console.log('---> outbound connections <---');
        console.log(cons.length);
        console.log('>------------------------<');
      },
      'broadcast': (args) =>{
        const msg = args[1];
        this._node.broadcast(msg);
      },
      'provide': (args) =>{
        this._node.announceContent();
      },
      'receive': ()=>{
        this._node.findContent();
      },
      'sync': () =>{
        this._node.findContentAndSync();
      },
      'getAllHandshakedPeers': () =>{
        const hsPeers = this._node.getAllHandshakedPeers();
        console.log(hsPeers);
        // res == FindPeersResMsg inside messages.js
        this._node.sendFindPeerRequest(hsPeers[0], (err, req, res)=>{
          console.log('ok got response!!! ', res.peers().length);
          nodeUtils.peerBankSeedtoPeerInfo(res.peers()[0], (err, peerInfo)=>{
            if (err) {
              console.log('ERR converting seed into peerInfo', err);
            } else {
              this._node.sendFindPeerRequest(peerInfo, (err, req, res)=>{
                if (err) {
                  console.log('error connecting to the seed peer! ', err);
                } else {
                  console.log('success connecting to the seed peer, his seeds len : ' + res.peers().length);
                }
              });
            }
          });
        });
      },
      'simpleCon': (args)=>{
        const id = args[1];
        this._node.isSimpleConnected(id);
      },
      'help': (args)=>{
        console.log('---> Commands List <---');
        console.log('$addPeer <address> : connect to a new peer manualy.');
        console.log('$getAddr : get the multiaddress of the node. ');
        console.log('$getOutConnections : get id list of the outbound connections ');
        console.log('$getInConnections : get list of the inbound connections ');
        console.log('$peerBank : get list of the potential (not connected) seeds');
        console.log('$discover : perform persistent discovery to reach optimal DHT');
        console.log('$inCount : number of inbound connections');
        console.log('$outCount : number of outbound connections');
        console.log('$broadcast <message> : broadcast a message to the whole network');
        console.log('$provide : announce the network the content the node provides');
        console.log('$simpleCon <multiaddr>: check if some addr is simple connected');
        console.log('$help : help');
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
      Parsers.list(listVal,this._globalWrapper);
    })
    .option('-n, --nickname [value]', 'nickname', (nick)=>{
      Parsers.nickname(nick,this._globalWrapper);
    })
    .option('-p, --port [value]', 'listening port', (strPort)=>{
      Parsers.port(strPort,this._globalWrapper);
    })
    .option('-i, --path [value]', 'id path', (theIdPath)=>{
      Parsers.idPath(theIdPath, this._globalWrapper);
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
  async _initEnvironment(){
    this._mainController = await new EnviornmentBuilder()
        .setNodeConfig(this._getFinalConfig())
        .build();
    this._node = this._mainController.getNode();
  }
  start() {
    console.log(Parsers.opener);
    let cmds = this._commands;
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

let cli = new CLI().start();

module.exports = CLI;
