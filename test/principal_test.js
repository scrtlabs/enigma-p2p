const jayson = require('jayson');
const assert = require('assert');
const PrincipalNode = require('../src/worker/PrincipalNode');
const MsgPrincipal = require('../src/policy/p2p_messages/principal_messages');


it('#1 Should Recieve Encrypted response message from mock principal', async function() {
  const port = 11700;
  const fakeResponse = '0061d93b5412c0c9';
  let fakeRequest = '84a46461746181a';

  return new Promise(async (resolve)=>{
    let server = jayson.server({
      getStateKeys: function(args, callback) {
        if(args.requestMessage) {
          let result = {encryptedResponseMessage: fakeResponse};
          callback(null, result);
        }
        else {
          callback('Missing requestMessage', null);
        }
      }
    }).http();

    server.listen(port, '127.0.0.1');
    let principalClient = new PrincipalNode({uri: 'http://127.0.0.1:'+port});
    let msg = MsgPrincipal.build({request: fakeRequest});
    let result = await principalClient.getStateKeys(msg);
    assert.strictEqual(result, fakeResponse);
    resolve();
  });
});