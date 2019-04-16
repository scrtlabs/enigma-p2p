class DeleteAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(params) {
    console.log("this functionality does not exist in this node!")
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
}
module.exports = DeleteAction;
