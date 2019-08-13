const ASB = require('../lib/ASB');


beforeAll(done => {


    done();

});

describe('Connect', () => {

    test('should create sub clent and sub service from connection string', async () => {
        await expect(ASB.connect()).resolves
    });

});