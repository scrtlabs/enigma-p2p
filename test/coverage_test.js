const path = require('path');

const TEST_TREE = require('./test_tree').TEST_TREE;
const assert = require('assert');
const PeerBank = require('../src/worker/handlers/PeerBank');;
const EnigmaNode = require('../src/worker/EnigmaNode');
const NodeController = require('../src/worker/controller/NodeController');
const B1Path = path.join(__dirname,"testUtils/id-l");
const B1Port = "10300";
const B2Path = "../../test/testUtils/id-d";
const B2Port = "10301";

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

it('#2 coverage', function(done){

  let tree = TEST_TREE.coverage;
  if(!tree['all'] || !tree['#2']){
    this.skip();
  }
  let bootstrapNodes = ["/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"];
  let node = NodeController.initDefaultTemplate({"port":B1Port, "idPath":B1Path, "nickname":"dns", "bootstrapNodes":bootstrapNodes});
  try{
    node.engNode().sendHeartBeat(null,null,(err)=>{
      assert.strictEqual(false,true,"should fail");
    });
  }catch(e){

  }

  try{
    node.engNode().startStateSyncRequest(null,null);
    assert.strictEqual(true,false,'should fail');
  }catch(e){

  }
  node.engNode().syncGetPeersPeerBook(null).catch(err=>{

    try{
      node.engNode().findPeers(null,null,null);
      assert.strictEqual(true,false,'should fail');
    }catch(e){

      try{
        node.engNode().subscribe()
      }catch(e){
        done();
      }
    }
  });
});

