const clients = require('../lib/clients');

const socket1 = {
    id: 123,
    username: ''
};

describe('Add User to Clients', () => {

    test('should add socket id and assign username to socket correctly', async () => {
        const result = await clients.addClient(socket1, 'user1');

        expect(result).toMatchObject({
            user1: expect.arrayContaining([123])
        });

        expect(socket1).toMatchObject({
            id: 123,
            username: 'user1'
        });

    });

    test('should add socket id and assign username to socket correctly, if values already exist', async () => {
        const result = await clients.addClient(socket1, 'user2');

        expect(result).toMatchObject({
            user2: expect.arrayContaining([123])
        });

        expect(socket1).toMatchObject({
            id: 123,
            username: 'user2'
        });

        const result2 = await clients.addClient({id: 456}, 'user3');

        expect(result2).toMatchObject({
            user2: expect.arrayContaining([123]),
            user3: expect.arrayContaining([456])
        });

        const result3 = await clients.addClient({id: 999}, 'user2');

        expect(result3).toMatchObject({
            user2: expect.arrayContaining([123, 999]),
            user3: expect.arrayContaining([456])
        });

    });
});

describe('Get Clients', () => {

    test('should retreive user correctly', async () => {
        await expect(clients.getClients('user1')).resolves.toStrictEqual(expect.arrayContaining([123]));
    });

    test('should return empty array for no user found', async () => {
        await expect(clients.getClients('user999')).resolves.toHaveLength(0);
    });

});

describe('Disconnect/Remove Clients', () => {

    test('should remove only socket id of disconnected socket if multiple exist for a user', async () => {
        await expect(clients.disconnectClient(socket1)).resolves.toHaveProperty('user2', [999]);
    });

    test('should remove user correctly if no sockets open', async () => {
        await expect(clients.disconnectClient({id: 999, username: 'user2'})).resolves.not.toHaveProperty('user2');
    });

});