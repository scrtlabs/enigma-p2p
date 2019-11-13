const PeerId = require('peer-id');
const {promisify} = require('util');

async function main() {
  const createAsync = promisify(PeerId.create);
  const opts = {
    bits: 2048,
    keyType: 'RSA',
  };
  const id = await createAsync(opts);
  console.log(JSON.stringify(id.toJSON(), null, 2));
}

main().catch(console.error);
