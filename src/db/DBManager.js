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
    _open(){
        let name = this._getDbName();
        let options = this._getOptions();
        let db = null;

        if(options !== undefined && options !== null) {
            db = level(name,options);
        }else{
            db = level(name);
        }
        return db;
    }
    _close(db,callback){
        db.close((err)=>{
            callback(err);
        });
    }
    put(key,value,callback){

        let db =this._open();

        db.put(key,value,(err)=>{
            this._close(db);
            callback(err);
        });
    }

    get(key,callback){

    }
    isExist(key,callback){

    }
    getAll(callback){

    }
}