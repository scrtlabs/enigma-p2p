const path = require('path');
const TEST_TREE = require('./test_tree').TEST_TREE;
const assert = require('assert');
const PersistentStateCache = require('../src/db/StateCache');
const testUtils = require('./testUtils/utils');

it('#1 test PersistentStateCache',function(done){
  let tree = TEST_TREE.cache;
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }

  let scAddr = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
  let scAddr2 = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52945';
  let initialStateDelta = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8';
  let initialStateDelta2 = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac9';
  let stateDelta = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668';
  let deltaIdx = 1;
  let stateDelta2 = '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32669';
  let deltaIdx2 = 1;
  let dbPath = path.join(__dirname, '/cache_temp_db');
  let cache = new PersistentStateCache(dbPath);
  cache.addAddress(scAddr,initialStateDelta,(err)=>{
    assert.strictEqual(undefined,err, 'err adding 1 addr [' + err +']');

    cache.getTip(scAddr,(err,tip)=>{
      assert.strictEqual(null,err, 'err get scAddr tip [' + err + ']');

      cache.updateTip(scAddr,stateDelta,deltaIdx,(err)=>{
        assert.strictEqual(undefined,err, 'err update tip ');
        cache.getTip(scAddr,(err,tip)=> {
          assert.strictEqual(null,err, 'err getting tip');

        });

        cache.addAddress(scAddr2,initialStateDelta2,(err)=>{
          assert.strictEqual(undefined,err, 'err adding 2 addr');
          cache.getAllAddrs((err,addrs)=>{
            assert.strictEqual(null,err, 'getAllAddrs');
            cache.getAllTips((err,tips)=>{
              assert.strictEqual(null,err, 'err getAllTips');
              testUtils.deleteFolderFromOSRecursive(dbPath, ()=>{
                cache._dbApi.close((err)=>{
                  done();
                })
              });
            });
          });
        });
      });
    });
  });
});
