const assert = require('assert');
const CIDUtil = require('../src/common/CIDUtil');
const EncoderUtil = require('../src/common/EncoderUtil');
const EngCID = require('../src/common/EngCID');
const StateUtils = require('../src/common/StateUtils');

const address = '0123456789ABcdeF0123456789AbcDEF00000000';
const hash = '0x5f8387c70ddbc27ab6cb2918ce879d8399b28300bf14fe604fe2e04f1ec9c640';
const b58 = 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB';
const msgDecoded = [{'name': 'Andrew'}, {'name': 'Maxim'}];
const msgEncoded = [146, 129, 164, 110, 97, 109, 101, 166, 65, 110, 100, 114,
  101, 119, 129, 164, 110, 97, 109, 101, 165, 77, 97, 120, 105, 109];

it('should parse hash', async function() {
  const h1 = CIDUtil.parseHashStr(hash);
  assert.strictEqual(h1, hash.substring(2, 66));
  const h2 = CIDUtil.parseHashStr(h1);
  assert.strictEqual(h2, h1);
});

it('should hash keccack', async function() {
  const h = CIDUtil.hashKeccack256(address);
  assert.strictEqual(h, hash);
});

it('should createCID', async function() {
  const r = '1b20' + hash.substring(2, 66);
  const c = CIDUtil.createCID(hash);
  assert.deepEqual(c.multihash, Buffer.from(r, 'hex'));
  assert.ok(CIDUtil.isValidCID(c));
  const h = CIDUtil.getKeccak256FromCID(c);
  assert.strictEqual(h, r);
});

it('should createCID from b58', async function() {
  const c = CIDUtil.createCIDFromB58(b58);
  assert.deepEqual(c.toBaseEncodedString(), b58);
});

it('should fail in trying to createCID from b58', async function() {
  const f = CIDUtil.createCIDFromB58('not a b58 encoded string');
  assert.strictEqual(null, f);
});

it('should fail to hash keccack from CID', async function() {
  const f = CIDUtil.getKeccak256FromCID(Buffer.from('not a valid CID'));
  assert.strictEqual(null, f);
});

it('should decode from network', async function() {
  const msg = EncoderUtil.decodeFromNetwork(msgEncoded);
  assert.deepEqual(msg, msgDecoded);
});

it('should encode to network', async function() {
  const msg = EncoderUtil.encodeToNetwork(msgDecoded);
  assert.deepEqual(msg, msgEncoded);
});

it('should fail to decode', async function() {
  const f = EncoderUtil.decode(null);
  assert.strictEqual(f, null);
});

const e1 = EngCID.createFromKeccack256(hash);

it('should create EngCID', async function() {
  const r = '1b20' + hash.substring(2, 66);
  assert.deepEqual(e1._cid.multihash, Buffer.from(r, 'hex'));
});

it('should create EngCID from network', async function() {
  const en = e1.encodeToNetwork();
  assert.deepEqual(en, Buffer.from([217, 51, 122, 52, 51, 65, 97, 71, 69, 121,
    57, 101, 88, 85, 83, 115, 78, 54, 49, 69, 53, 88, 84, 53, 87, 53, 66, 100,
    112, 90, 109, 86, 118, 120, 89, 115, 71, 74, 82, 84, 111, 86, 74, 51, 54,
    102, 102, 52, 52, 70, 112, 121, 117]));
  const e2 = EngCID.createFromNetwork(en);
  assert(e1.equalEngCID(e2));
});

it('should fail to create from network', async function() {
  const e2 = EngCID.createFromNetwork('not a b58 encoded array');
  assert.strictEqual(e2, null);
});

it('should getCID', async function() {
  assert.strictEqual(e1.getCID(), e1._cid);
});

it('should engCID.toBuffer', async function() {
  const r = '1b20' + hash.substring(2, 66);
  assert.deepEqual(e1.toBuffer(), Buffer.from('019001'+r, 'hex'));
});

it('should equalEngCID and equalKeccack256', async function() {
  const e2 = EngCID.createFromKeccack256(hash.substring(2, 66));
  assert(e1.equalEngCID(e2));
  assert(e1.equalKeccack256(hash));
});

it('should fail to equalKeccack256', async function() {
  const f = e1.equalKeccack256('not a valid hash');
  assert.strictEqual(f, false);
});

it('should not equalCID', function() {
  const e2 = CIDUtil.createCID(hash.substring(2, 66));
  assert(!e1.equalEngCID(e2));
});

it('should getKeccack', function() {
  assert(e1.getKeccack256(true), hash);
  assert(e1.getKeccack256(false), hash.substring(2, 66) );
});

it('should fail to create EngCID', async function() {
  const f = EngCID.createFromKeccack256('not a valid hash');
  assert.strictEqual(f, null);
});

it('should hash', async function() {
  const h = StateUtils.kecckak256Hash('Hello World');
  assert.strictEqual(h, '0x592fa743889fc7f92ac2a37bb1f5ba1daf2a5c84741ca0e0061d243a2e6707ba');
});

it('should hex -> bytes -> hex', async function() {
  let b = StateUtils.hexToBytes('48656c6c6f20576f726c64');
  assert.strictEqual(StateUtils.toHexString(b), '48656c6c6f20576f726c64');
  b = StateUtils.hexToBytes('0x48656c6c6f20576f726c64');
  assert.strictEqual(StateUtils.toHexString(b), '48656c6c6f20576f726c64');
});

it('should int -> bytes -> int', async function() {
  const b = StateUtils.intTo4BytesArr(47);
  assert.strictEqual(StateUtils.bytesArrToInt(b), 47);
});

it('should tuple -> key -> tuple', async function() {
  const a = hash.toLowerCase().substring(2, 66);
  const k = StateUtils.toBytesKey(StateUtils.hexToBytes(a), 7);
  assert.deepEqual(StateUtils.deltaKeyBytesToTuple(k), {'address': a, 'index': 7});
});
