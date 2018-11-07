const NodeController = require('../worker/controller/NodeController');
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');
const server = new http.Server(app);
const io = require('socket.io')(http);

// const opn = require('opn');
const utils = require('../common/utils');


const B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';

const config = {
  'bootstrapNodes': [B1Addr],
  //    'port' : B1Port,
  'nickname': 'monitor',
//    'idPath' : B1Path,
};

const nodes = {};
const links = {};
const opener = '  ______       _                         _____ ___  _____  \n' +
' |  ____|     (_)                       |  __ \\__ \\|  __ \\ \n' +
' | |__   _ __  _  __ _ _ __ ___   __ _  | |__) | ) | |__) |\n' +
' |  __| | \'_ \\| |/ _` | \'_ ` _ \\ / _` | |  ___/ / /|  ___/ \n' +
' | |____| | | | | (_| | | | | | | (_| | | |    / /_| |     \n' +
' |______|_| |_|_|\\__, |_| |_| |_|\\__,_| |_|   |____|_|     \n' +
'                  __/ |                                    \n' +
'                 |___/                                     ';
console.log(opener);
console.log('----- starting node with config ----- ');
console.log(JSON.stringify(config, null, 2));
console.log('--------------------------------------');
const node = NodeController.initDefaultTemplate(config);

app.use(cors());
app.use(express.static('public'));

/**
 * Start a node
 */
async function start() {
  await node.engNode().syncRun();
  console.log('node has started');
  // even when the node has started, SelfPeerInfo may not yet be available
  let error = null;
  do {
    error = null;
    try {
      nodes[node.engNode().getSelfIdB58Str()] = node.engNode().getSelfPeerInfo();
    } catch (err) {
      error = err;
    }
  } while (error);
}

start();

let contacted = [];


/**
 * Recursively query peers.
 * @param {peerInfo} h
 */
function recursiveContact(h) {
  node.sendFindPeerRequest(h, (err, req, res)=>{
    const myId = h.id._idB58String;
    contacted.push(myId);

    if (err) {
      // if we get here is because we are trying to connect to a node that has been removed
      console.log('Peer removed: ' + myId);
      delete nodes[myId];
      io.emit('delNode', h);

      // delete any links this node had
      linksToDelete = Object.keys(links).filter(function(key) {
        return key.match(myId);
      });

      for (let k = 0; k<linksToDelete.length; k++) {
        console.log('Link removed: ' + linksToDelete[k]);
        delete links[linksToDelete[k]];
      }
    } else {
      for (let p = 0; p<res.peers().length; p++) {
        utils.peerBankSeedtoPeerInfo(res.peers()[p], (err, peerInfo)=>{
          if (err) {
            // fail silently
          }
          nodeId = peerInfo.id._idB58String;
          if (myId < nodeId) {
            link = {'source': myId, 'target': nodeId};
            key = myId + '-' + nodeId;
          } else {
            link = {'source': nodeId, 'target': myId};
            key = nodeId + '-' + myId;
          }
          if (!(nodeId in nodes)) {
            nodes[nodeId] = peerInfo;
            console.log('Peer added: ' + nodeId);
            io.emit('addNode', peerInfo);
          }
          if (!(key in links)) {
            links[key]=link;
            console.log('Link added:');
            console.log(link);
            io.emit('addLink', link);
          }
          if (!contacted.includes(nodeId)) {
            recursiveContact(peerInfo);
          }
        });
      }
    }
  });
}

/**
 * Periodically monitor the entire Enigma network.
 */
function periodicCheck() {
  contacted = [];
  // I add myself first
  myId = node.engNode().getSelfIdB58Str();
  contacted.push(myId);
  // I take note of the nodes I knew to see if I've lost any
  const myLinks = Object.keys(links).filter((name) => {
    const matcher = new RegExp(myId, 'g');
    return matcher.test(name);
  });

  // get everyone I know
  hsPeers = node.getAllHandshakedPeers();
  for (const h of hsPeers) {
    nodeId = h.id._idB58String;
    if (!(nodeId in nodes)) {
      nodes[nodeId]=h;
      console.log('Peer added: ' + nodeId);
      io.emit('addNode', h);
    }

    // remove this link from the ones I already know
    key1 = myId + '-' + nodeId;
    key2 = nodeId + '-' + myId;
    index1 = myLinks.indexOf(key1);
    if (index1 !== -1) myLinks.splice(index1, 1);
    index2 = myLinks.indexOf(key2);
    if (index2 !== -1) myLinks.splice(index2, 1);

    recursiveContact(h);
  }
  // If I am left with any links at this point, I've lost them
  if (myLinks.length) {
    for (let l = 0; l < myLinks.length; l++) {
      console.log('Link removed: ' + myLinks[l]);
      const ns = myLinks[l].split('-');
      let missingNode;
      if (ns[0] != myId) {
        missingNode = ns[0];
      } else {
        missingNode = ns[1];
      }
      delete links[myLinks[l]];
      if (missingNode in nodes) {
        recursiveContact(nodes[missingNode]);
      }
      if (myId < missingNode) {
        link = {'source': myId, 'target': missingNode};
      } else {
        link = {'source': missingNode, 'target': myId};
      }
      io.emit('delLink', link);
    }
  }
}


app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  console.log('a user connected');
  socket.emit('initEvent', {'nodes': nodes, 'links': links});
  socket.on('requestNode', function(nodeIndex) {
    console.log('Request to send '+nodeIndex+' returned.');
    socket.emit('addNode', nodes[nodeIndex]);
  });
});

server.listen(3000, function() {
  console.log('listening on *:3000');
});

// Scan the network every 5 seconds
setInterval(periodicCheck, 5000);

console.log('Press any key to exit');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit.bind(process, 0));
