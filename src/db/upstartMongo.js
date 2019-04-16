const mongo = require('mongodb').MongoClient;
const url = 'mongodb://admin:admin123@localhost:27017';
// const url = process.env.MONGODB_DATABASE_URL;

async function upstartMongo() {
  let client = null;
  try {
    client = await mongo.connect(url, { useNewUrlParser: true });
  } catch (e) {
    console.log(`error while trying to connect to mongo client ${e}`)
  }

  return client
}
module.exports = upstartMongo;
