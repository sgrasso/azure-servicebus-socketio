// User to socketId map
const clients = {};

// Create listener for requests to add users for private messaging.
// Store multiple ids for a user for multiple browsers/tabs.
const addClient = (socket, username) => {
    socket.username = username;
    clients[username] = clients[username] || [];
    clients[username].push(socket.id);
};

const getClients = user => {
     //User has socket open, send it the message
     if (clients.hasOwnProperty(user)) {
        return clients[user];
    }

    return null;
}

const disconnectClient = socket => {
    // Remove user from connected clients on disconnect
    if (socket.username && clients.hasOwnProperty(socket.username)) {
        for (let i = 0; i < clients[socket.username].length; i++) {
            delete clients[socket.username][i];
        }
    };
};

module.exports = {
    addClient,
    getClients,
    disconnectClient
}
