// User to socketId map
const clients = {};

// Create listener for requests to add users for private messaging.
// Store multiple ids for a user for multiple browsers/tabs.
const addClient = async (socket, username) => {
    socket.username = username;
    clients[username] = clients[username] || [];
    clients[username].push(socket.id);

    return clients;
};

const getClients = async user => {
     //User has socket open, send it the message
     if (clients.hasOwnProperty(user)) {
        return clients[user];
    }

    return [];
}

const disconnectClient = async socket => {
    // Remove user from connected clients on disconnect
    if (socket.username && clients.hasOwnProperty(socket.username)) {
        const index = clients[socket.username].indexOf(socket.id);

        if (index !== -1) clients[socket.username].splice(index, 1);

        if (!clients[socket.username].length) delete clients[socket.username];
    };

    return clients;
};

module.exports = {
    addClient,
    getClients,
    disconnectClient
}
