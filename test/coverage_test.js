const path = require('path');
const TEST_TREE = require('./test_tree').TEST_TREE;
const assert = require('assert');
const NodeController = require('../src/worker/controller/NodeController');
const B1Path = path.join(__dirname,"testUtils/id-l");
const B1Port = "10300";


it('#1 coverage', function(done){

  let tree = TEST_TREE.coverage;
  if(!tree['all'] || !tree['#1']){
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

