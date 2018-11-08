const TEST_TREE = require('./test_tree').TEST_TREE;
const assert = require('assert');
const waterfall = require('async/waterfall');
const PeerBank = require('../src/worker/handlers/PeerBank');;
const PeerInfo = require('peer-info');
const PeerId = require('peer-id');
const pongMsg = {
  "jsonrpc":"2.0",
  "method":"pong",
  "id":"vXogAvLNiVTQ",
  "result":{
    "response":{
      "from":"QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm",
      "to":"QmTL1nKaKFTn8R6oCMPB61L6cZBeAY39RnQfeTxgQuBhC1",
      "status":0,
      "seeds":[
        {
          "peerId":{
            "id":"Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP"
          },
          "connectedMultiaddr":"/ip4/0.0.0.0/tcp/10334/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP",
          "multiAddrs":[
            "/ip4/0.0.0.0/tcp/10334/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP"
          ]
        },
        {
          "peerId":{
            "id":"QmeUmy6UtuEs91TH6bKnfuU1Yvp63CkZJWm624MjBEBazW",
            "pubKey":"CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCvr8VY7MvdFc3GvIdrNCwFns554yuUrb6fPE/giU1Yels0yYXxcpQIgf0c9uuAoaBcJx6YvvkdPqEAgKwGUeauzuyGHxcVK3lYbF/GtioiMyKnisuhHJ7zz8rMDg2lr4yhG/eNvENL5fTbD6QN17vDQvAvzrO4RKBKWOXDc02NYIJuN0uKGs/9GtXY2YEBG8kR4SVH3dWPLK3T91P1VzRtqhGDvm2K0NRhLzedwDJLDu/T59MDRshMuOy8gtMNeQXHJuRuVSL4KRcugihK6u79kMGDtdlYz7cuEk/aXHlutDYR5LYIewncfxtfcBSEZT/xXOIcSwFUhM8QzZtIetilAgMBAAE="
          },
          "connectedMultiaddr":"/ip4/127.0.0.1/tcp/39013/ipfs/QmeUmy6UtuEs91TH6bKnfuU1Yvp63CkZJWm624MjBEBazW",
          "multiAddrs":[
            "/ip4/127.0.0.1/tcp/39013/ipfs/QmeUmy6UtuEs91TH6bKnfuU1Yvp63CkZJWm624MjBEBazW",
            "/ip4/192.168.34.19/tcp/39013/ipfs/QmeUmy6UtuEs91TH6bKnfuU1Yvp63CkZJWm624MjBEBazW"
          ]
        }
      ]
    }
  }
};

it('#1 test PeerBank',function(done){
  let tree = TEST_TREE.coverage;
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }
    let peerBank = new PeerBank();
    assert.strictEqual(0,peerBank.getPeerBankList().length);
    let seeds = pongMsg.result.response.seeds;
    peerBank.addPeer(seeds[0]);
    assert.strictEqual(1,peerBank.getPeerBankList().length);
    peerBank.removePeer(seeds[0].peerId.id);
    assert.strictEqual(0,peerBank.getPeerBankList().length);
    done();
});


