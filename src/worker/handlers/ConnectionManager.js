
class ConnectionManager{

    constructor(enigmaNode){
        this._enigmaNode = enigmaNode;
        this._isDiscovering = false;
    }
    isDiscovering(){
        return this._isDiscovering;
    }


}