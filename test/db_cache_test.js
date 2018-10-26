const assert = require('assert');
const DbKey = require('../src/db/DbKey');

it('should create a DbKey from delta tuple (addr,idx)', function(done) {
    let index = 12;
    let addr = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';

    let should = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186, 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68, 0, 0, 0, 12];

    let dbKey = DbKey.fromDeltaTouple(addr,index);

    assert.deepStrictEqual(should,dbKey.getBytesKey(), "bytes key not equal");
    done();
});

it('should create a DbKey from contract (hex addr)', function(done) {
    let addr = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
    let should = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186, 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68];

    let dbKey = DbKey.fromContractAddr(addr);

    assert.deepStrictEqual(should,dbKey.getBytesKey(), "bytes not equal");
    done();
});

it('should create a DbKey from contract (byte array)', function(done) {

    let should = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
    let byteKey = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186, 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68];
    let dbKey = DbKey.fromContractBytes(byteKey);
    assert.deepStrictEqual(should,'0x'+dbKey.getAddress(), "address not equal");
    done();
});

it('should create a DbKey from delta (byte array)', function(done) {
    let shouldIndex = 12;
    let shouldAddr = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';

    let byteKey = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186, 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68, 0, 0, 0, 12];

    let dbKey = DbKey.fromDeltaBytes(byteKey);

    assert.strictEqual(shouldAddr,'0x'+dbKey.getAddress(), "address not equal");
    assert.strictEqual(shouldIndex , dbKey.getIndex(), "index not equal");
    assert.strictEqual(true, dbKey.isDelta(), "not delta");
    assert.strictEqual(false, dbKey.isContract(), "a contract key");
    done();
});

it('should compare 2 keys', function(done) {

  let hexKey = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
  let byteKey = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186, 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68];
  let dbKey1 = DbKey.fromContractBytes(byteKey);
  let dbKey2 = DbKey.fromContractAddr(hexKey);

  assert.strictEqual(true, dbKey1.equals(dbKey2), " keys are not equal");

  done();
});

