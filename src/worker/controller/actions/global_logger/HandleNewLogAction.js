
class HandleNewLogAction{
  constructor(controller){
    this._controller = controller;
    this._dbClient = this._controller.getMongoClient();
    this._collection = this._getCollection();
  }
  execute(params){
    let doc = JSON.parse(params.params.data);
    doc.loggerTimeUtc = new Date();
    this._collection.insertOne(doc);
  }
  async asyncExecute(params) {
    const action = this;
    return new Promise((resolve, reject) => {
      params.callback = function(status, result) {
        resolve({status:status,result : result});
      };
      action.execute(params);
    });
  }
  _getCollection() {
    if(this._dbClient) {
      const db = this._dbClient.db("mydb");
      return db.collection("mycol");
    } else {
      console.log(JSON.stringify(this._dbClient));
      return null
    }
  }
}
module.exports = HandleNewLogAction;


