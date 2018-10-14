const assert = require('assert');

it('it works! ', async function(){

    return new Promise(async (resolve)=>{
        assert.strictEqual(1,1);

        resolve();

    });
});

