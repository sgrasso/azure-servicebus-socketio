const uuid = require('node-uuid');
const port = process.env.NODE_PORT || 3001

// Create http server to receive socket requests
const io = require('socket.io')(port);

const ASB = require('./lib/ASB');
const rules = require('./lib/rules');
const clients = require('./lib/clients');

// Define connection string and related Service Bus entity names here
const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING;
const subscriptionName = process.env.HOSTNAME || uuid.v1();
const topicName = process.env.AZURE_SERVICEBUS_TOPIC_NAME;

// Subscription creation options
const subOptions = {
    DefaultMessageTimeToLive: 'PT30S',
    LockDuration: 'PT30S',
    AutoDeleteOnIdle: (process.env.NODE_ENV === 'production') ? 'PT24H' : 'PT5M'
}

// message receiver and handler options
const messageOptions = {
    receiveMode: 'receiveAndDelete',
    handler: {
        maxConcurrentConnections: 10
    }
}

// Create listener for connection event to client
io.on('connection', socket => {
    socket.emit('connected', 'Socket Connected...');

    // Add socketid and user to client mapping
    socket.on('add-user', username => {
        clients.addClient(socket, username);
    });

    socket.on('disconnect', () => {
        clients.disconnectClient(socket);
    });
});

// Message Handler success method
const messageSuccess = async message => {
    const socketIds = clients.getClients(message.body.user);

    for (let i = 0; i < socketIds.length; i++) {
        io.to(socketIds[i]).emit(message.label, message.body);
    }
};

// Message Handler error method
const messageError = async e => {
    console.error(`Error from message handler - ${e}`);

    // Error or lost connection. Retry...
    await initSubscription();
};

// Inititalize Subscription
const initSubscription = async () => {
    try {
        const isNew = await ASB.checkSubscription(subscriptionName, topicName, subOptions);

        // If a new subscription needed to be created set rules and handler.
        if (isNew){
            await ASB.setRules(rules, topicName, subscriptionName);
            await ASB.createMessageHandler(
                topicName,
                subscriptionName,
                messageSuccess,
                messageError,
                messageOptions
            );
        }
    }
    catch (e) {
        console.error(`Error handling subscription initilization - ${e}`);
        process.exit(1);
    }
}

// Connect Azure Service Bus and Execute subscription init.
const startServer = async () => {
    try {
        ASB.connect(connectionString);

        await initSubscription();

        console.log(`Socket Server running at: localhost:${port} as ${process.env.NODE_ENV}`);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}

startServer();
