const NodeController = require('../worker/controller/NodeController');

const B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';

const config = {
  'bootstrapNodes': [B1Addr],
  'nickname': 'peer',
};

const node = [];
let i = 0;

function discover(node) {
  node.tryConsistentDiscovery();
}

async function start(node, i) {
  await node.engNode().syncRun();
  console.log('node '+i+' has started');
  // With 50% probability
  // if (Math.random() > 0) {
  //   // node discovers peers around in the next 1 to 5 seconds
  //   setTimeout(discover, Math.floor(Math.random() * 5 + 1) * 1000, node);
  // }
}

function addNode() {
  node[i] = NodeController.initDefaultTemplate(config);
  start(node[i], i);
  i = i + 1;
}

setInterval(addNode, 8000);

// for (i = 0; i < 10; i++) {
//   node[i] = NodeController.initDefaultTemplate(config);
//   start(node[i],i)
// }
