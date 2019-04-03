const assert = require('assert');
const CIDUtil = require('../src/common/CIDUtil');
const EncoderUtil = require('../src/common/EncoderUtil');
const EngCID = require('../src/common/EngCID');
const StateUtils = require('../src/common/DbUtils');
const crypto = require('../src/common/cryptography');

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
  assert.notStrictEqual(null,c, "error creating cid is null");
  assert.deepStrictEqual(c.multihash, Buffer.from(r, 'hex'));
  assert.ok(CIDUtil.isValidCID(c));
  const h = CIDUtil.getKeccak256FromCID(c);
  assert.deepStrictEqual(h, r);
});

it('should createCID from b58', async function() {
  const c = CIDUtil.createCIDFromB58(b58);
  assert.deepStrictEqual(c.toBaseEncodedString(), b58);
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
  assert.deepStrictEqual(msg, msgDecoded);
});

it('should encode to network', async function() {
  const msg = EncoderUtil.encodeToNetwork(msgDecoded);
  assert.deepStrictEqual(msg, msgEncoded);
});

it('should fail to decode', async function() {
  const f = EncoderUtil.decode(null);
  assert.strictEqual(f, null);
});

it('should convert hex to ascii', async function() {
  assert.strictEqual(EncoderUtil.hexToAscii(31323334), '1234');
  assert.strictEqual(EncoderUtil.hexToAscii('68656c6c6f'), 'hello');
  assert.strictEqual(EncoderUtil.hexToAscii('0x68656c6c6f'), 'hello');
  assert.strictEqual(EncoderUtil.hexToAscii('0x68656c6c6f20776f726c64'), 'hello world');
  assert.strictEqual(EncoderUtil.hexToAscii('20 20 20 20 20 68 65 6c 6c 6f 20 20 20 20 20'), '     hello     ');
  assert.strictEqual(EncoderUtil.hexToAscii('7b226964223a22333337373637373332393539313232323730333939323938343134383'+
    '739343938353130313333222c2274696d657374616d70223a22323031392d30322d30345431363a31383a33302e313435333133222c226'+
    '97376456e636c61766551756f7465537461747573223a2247524f55505f4f55545f4f465f44415445222c22706c6174666f726d496e666'+
    'f426c6f62223a2231353032303036353034303030373030303030353035303230343031303130303030303030303030303030303030303'+
    '03030303830303030303930303030303030323030303030303030303030303041433744443837303931313443384344314536463038424'+
    '14345423532383234343734464344454433433546353633464533424346423531433932334645384335423630433336393832383443343'+
    '537424545363741344246303142314138373442353244364146454137394542433731363638443033304231323646374632453437222c2'+
    '2697376456e636c61766551756f7465426f6479223a2241674141414d634b414141484141594141414141414259422b56773575656f776'+
    '62b717275514774772b346667785574304e7456677862754f4b655a756f52794167582f42502f2f4141414141414141414141414141414'+
    '14141414141414141414141414141414141414141414141414141414141414141414141414141414142774141414141414141414841414'+
    '14141414141414a56764735414d5850336e6b7569384670755365484548354968556c426c342b6c32324c54556837507a3341414141414'+
    '1414141414141414141414141414141414141414141414141414141414141414141414141434431786e6e6665724b46484432757659715'+
    '45864444138695a32326b434435787737683338434d664f6e6741414141414141414141414141414141414141414141414141414141414'+
    '14141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414'+
    '14141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414'+
    '14141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414'+
    '14141414141414141414141414141414141417765475a6c4d6a41794e6a41335a5441794e6a59305a54686b4f54646d4f546b304e544e6'+
    '85a6d55784d7a6b77595451344d7a566b596a6b4141414141414141414141414141414141414141414141414141414141227d'),
    '{"id":"337767732959122270399298414879498510133","timestamp":"2019-02-04T16:18:30.145313",'+
    '"isvEnclaveQuoteStatus":"GROUP_OUT_OF_DATE","platformInfoBlob":"1502006504000700000505020401010000000000000000'+
    '000008000009000000020000000000000AC7DD8709114C8CD1E6F08BACEB52824474FCDED3C5F563FE3BCFB51C923FE8C5B60C3698284C'+
    '457BEE67A4BF01B1A874B52D6AFEA79EBC71668D030B126F7F2E47","isvEnclaveQuoteBody":"AgAAAMcKAAAHAAYAAAAAABYB+Vw5ueo'+
    'wf+qruQGtw+4fgxUt0NtVgxbuOKeZuoRyAgX/BP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAHA'+
    'AAAAAAAAJVvG5AMXP3nkui8FpuSeHEH5IhUlBl4+l22LTUh7Pz3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACD1xnnferKFHD2uvY'+
    'qTXdDA8iZ22kCD5xw7h38CMfOngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'+
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'+
    'AAAAAAAAAAAAAAAAAAAAweGZlMjAyNjA3ZTAyNjY0ZThkOTdmOTk0NTNhZmUxMzkwYTQ4MzVkYjkAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}');
  assert.strictEqual(EncoderUtil.hexToAscii(true), '');
  assert.strictEqual(EncoderUtil.hexToAscii([1, 2, 3, 4, 5]), '');
})

const e1 = EngCID.createFromKeccack256(hash);

it('should create EngCID', async function() {
  const r = '1b20' + hash.substring(2, 66);
  assert.deepStrictEqual(e1._cid.multihash, Buffer.from(r, 'hex'));
});

it('should create EngCID from network', async function() {
  const en = e1.encodeToNetwork();
  assert.deepStrictEqual(en, [217, 51, 122, 52, 51, 65, 97, 71, 69, 121,
    57, 101, 88, 85, 83, 115, 78, 54, 49, 69, 53, 88, 84, 53, 87, 53, 66, 100,
    112, 90, 109, 86, 118, 120, 89, 115, 71, 74, 82, 84, 111, 86, 74, 51, 54,
    102, 102, 52, 52, 70, 112, 121, 117]);
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
  assert.deepStrictEqual(e1.toBuffer(), Buffer.from('019001'+r, 'hex'));
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
  const h = crypto.hash('48656c6c6f20576f726c64');
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

it('should int -> bytes -> int for max big int ', async function() {
    let rustMaxU32 = 4294967295;
    const b = StateUtils.intTo4BytesArr(rustMaxU32);
    assert.strictEqual(StateUtils.bytesArrToInt(b), rustMaxU32);
});

it('should tuple -> key -> tuple', async function() {
  const a = hash.toLowerCase().substring(2, 66);
  const k = StateUtils.toBytesKey(StateUtils.hexToBytes(a), 7);
  assert.deepStrictEqual(StateUtils.deltaKeyBytesToTuple(k), {'address': a, 'index': 7});
});
