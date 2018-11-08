const path = require('path');
const assert = require('assert');
const TEST_TREE = require(path.join(__dirname,"../test_tree")).TEST_TREE;

it('#1 it works! ', async function(){
  let tree = TEST_TREE.ethereum;
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }
    return new Promise(async (resolve)=>{
        assert.strictEqual(1,1);

        resolve();

    });
});

it('#2 it works with done()', function (done){
  let tree = TEST_TREE.ethereum;
  if(!tree['all'] || !tree['#2']){
    this.skip();
  }
  done();
});
