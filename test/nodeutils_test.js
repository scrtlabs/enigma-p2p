const assert = require('assert');
const timestamp = require('unix-timestamp');
const nodeUtils = require('../src/common/utils');
const peerInfo = require('peer-info');
const multiaddr = require('multiaddr');
const messages = require('../src/policy/p2p_messages/messages');

const peerId = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const peerUrl = '/ip4/0.0.0.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const peerDict1 = {'peerId': {'id': peerId}, 'connectedMultiaddr': peerUrl,
  'multiAddrs':
  ['/ip4/127.0.0.1/tcp/44883/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',
    '/ip4/192.168.14.8/tcp/44883/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm']};
const peerDict2 = {'peerId': {'id': peerId, 'privKey': undefined, 'pubKey': undefined},
  'connectedMultiaddr': peerUrl, 'multiAddrs': [peerUrl]};


// All the number '1' fields in the streams below are placeholders, do not imply proper field values
const stream1 = '{"from": "'+peerId+'", "to": "'+peerId+'", "id": 1, "findpeers": 1}';
const stream2 = '{"from": "'+peerId+'", "to": "'+peerId+'", "id": 1, "status": 1, "seeds": 1}';
const stream3 = '{"from": "'+peerId+'", "to": "'+peerId+'", "id": 1, "maxpeers": 1}';
const stream4 = '{"from": "'+peerId+'", "to": "'+peerId+'", "id": 1, "peers": 1}';

it('should parsePeerBook', function() {
  assert.strictEqual(nodeUtils.parsePeerBook(null), null);
  nodeUtils.connectionStrToPeerInfo(peerUrl, (e, p)=>{
    p.connect(peerUrl); // ToDo: there is no function in source code that will process `connectedMultiaddr`
    assert.deepEqual(nodeUtils.parsePeerBook([p, p]), [peerDict2, peerDict2]);
  });
});

it('should parsePeerInfo', function() {
  assert.strictEqual(nodeUtils.parsePeerInfo(null), null);
  nodeUtils.connectionStrToPeerInfo(peerUrl, (e, p)=>{
    p.connect(peerUrl); // ToDo: there is no function in source code that will process `connectedMultiaddr`
    assert.deepEqual(nodeUtils.parsePeerInfo(p), peerDict2);
  });
});

it('should generate randId', function() {
  assert.strictEqual(nodeUtils.randId().length, 12);
  assert.notEqual(nodeUtils.randId(), nodeUtils.randId());
});

it('should toPingMsg', function() {
  assert.throws(function() {
    nodeUtils.toPingMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toPingMsg(stream1);
  assert(m instanceof messages.PingMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should toPongMsg', function() {
  assert.throws(function() {
    nodeUtils.toPongMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toPongMsg(stream2);
  assert(m instanceof messages.PongMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should toHeartBeatReqMsg', function() {
  assert.throws(function() {
    nodeUtils.toPongMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toHeartBeatReqMsg(stream1);
  assert(m instanceof messages.HeartBeatReqMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should toHeartBeatResMsg', function() {
  assert.throws(function() {
    nodeUtils.toPongMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toHeartBeatResMsg(stream1);
  assert(m instanceof messages.HeartBeatResMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should toFindPeersReqMsg', function() {
  assert.throws(function() {
    nodeUtils.toPongMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toFindPeersReqMsg(stream3);
  assert(m instanceof messages.FindPeersReqMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should toFindPeersResMsg', function() {
  assert.throws(function() {
    nodeUtils.toPongMsg('not a valid message stream');
  }, Error);

  m = nodeUtils.toFindPeersResMsg(stream4);
  assert(m instanceof messages.FindPeersResMsg);
  assert(m.isValidMsg());
  assert.strictEqual(m.from(), peerId);
  assert.strictEqual(m.to(), peerId);
});

it('should extractId', function() {
  assert.strictEqual(nodeUtils.extractId('not a valid url'), null);
  assert.strictEqual(nodeUtils.extractId(peerUrl), peerId);
});

it('should check isFunction and isString', function() {
  assert(nodeUtils.isFunction(nodeUtils.isFunction));
  const string = 'this is not a function';
  assert(!nodeUtils.isFunction(string));

  assert(nodeUtils.isString(string));
  assert(!nodeUtils.isString(nodeUtils.isString));
});

it('should applyDelta', function() {
  assert.deepEqual(nodeUtils.applyDelta({a: 'c'}, {a: 'bb', d: 'c'}), {a: 'bb', d: 'c'});
  assert.deepEqual(nodeUtils.applyDelta({a: null}, {a: 'c', d: 'c'}), {a: 'c', d: 'c'});
  assert.deepEqual(nodeUtils.applyDelta({a: {b: 'c'}}, {a: {d: 'e'}}), {a: {b: 'c', d: 'e'}});
  assert.deepEqual(nodeUtils.applyDelta(null), {});
});

it('should return unixTimestamp', function() {
  assert(timestamp.now() - nodeUtils.unixTimestamp() < 0.1);
});

it('should dictToList', function() {
  const dict = {'bananas': 2, 'apples': 5, 'strawberries': 10};
  assert.deepEqual(nodeUtils.dictToList(dict), [2, 5, 10]);
});

it('should pick random from list', function() {
  const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  assert.deepEqual(nodeUtils.pickRandomFromList(list, 0), list);
  assert.deepEqual(nodeUtils.pickRandomFromList(list, 20), list);
  nodeUtils.pickRandomFromList(list, 5).forEach(function(item) {
    assert(list.includes(item));
  });
});

it('should validate IPFS address', function() {
  assert(nodeUtils.isIpfs('/ip4/0.0.0.0/tcp/10333/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'));
  assert(!nodeUtils.isIpfs('not a valid IPFS address'));
});

it('should peerBankSeedtoPeerInfo', function() {
  assert.throws(function() {
    nodeUtils.peerBankSeedtoPeerInfo('not a valid seed', function(e, p) {});
  }, Error);

  nodeUtils.connectionStrToPeerInfo(peerUrl, (e, p)=>{
    nodeUtils.peerBankSeedtoPeerInfo(p, (e, i)=>{
      assert.strictEqual(e, null);
      assert.strictEqual(i, p);
    });
  });

  nodeUtils.peerBankSeedtoPeerInfo(peerDict1, (e, i)=>{
    assert.strictEqual(e, null);
    assert.strictEqual(i.multiaddrs.size, 2);
    assert.deepEqual(i.id.toJSON(), {'id': peerId, 'privKey': undefined, 'pubKey': undefined});
  });
});

it('should connectionStrToPeerInfo', function() {
  assert.throws(function() {
    nodeUtils.connectionStrToPeerInfo('not a valid candidate', function(e, p) {});
  }, Error);

  nodeUtils.connectionStrToPeerInfo(peerUrl, (e, p)=>{
    assert(peerInfo.isPeerInfo(p));
    assert.strictEqual(e, null);
    assert.deepEqual(p.id.toJSON(), {'id': peerId, 'privKey': undefined, 'pubKey': undefined});
    assert.strictEqual(p.multiaddrs.size, 1);
    assert(p.multiaddrs.has(multiaddr(peerUrl)));
  });
});
