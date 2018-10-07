const level = require('level');

class DBManager{

    initialize(options){
        this._options = options;
    }
    _getDbName(){
        return this._options.name;
    }
    _getOptions(){
        return this._options.options;
    }

    get(key,callback){

    }
    isExist(key,callback){

    }
    getAll(callback){

    }
}