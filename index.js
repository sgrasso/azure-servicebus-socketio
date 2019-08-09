// Create http server to receive socket requests
const io = require('socket.io')(3001);

const uuid = require('node-uuid');
const { ServiceBusClient, ReceiveMode } = require('@azure/service-bus');
const ServiceBusService = require('azure-sb');

// Define connection string and related Service Bus entity names here
const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING;
const subscriptionName = process.env.HOSTNAME || uuid.v1();
const topicName = process.env.AZURE_SERVICEBUS_TOPIC_NAME;

// Create connection to Service Bus
const sbClient = ServiceBusClient.createFromConnectionString(connectionString);
const sbService = ServiceBusService.createServiceBusService(connectionString);

// Set autoDelete based on Environment
const autoDelete = (process.env.NODE_ENV === 'production') ? 'PT24H' : 'PT5M';

// User to socketId map
const clients = {};

// Create listener for connection event to client
io.on('connection', socket => {
    socket.emit('connected', 'Socket Connected...');

    // Create listener for requests to add users for private messaging
    socket.on('add-user', username => {
        socket.username = username;
        clients[username] = socket.id;
    });

    socket.on('disconnect', () => {
        // Remove user from connected clients on disconnect
        if (socket.username && clients.hasOwnProperty(socket.username)) {
            delete clients[socket.username];
        };
    });
});

// Message Handler success method
const messageSuccess = message => {
    //User has socket open, send it the message
    if (clients.hasOwnProperty(message.body.user)) {
        io.to(clients[message.body.user]).emit(message.label, message.body);
    }
};

// Message Handler error method
const messageError = async e => {
    console.error(`Error within message handler - ${e}`);

    try {
        await checkSubscription();
        await createMessageHandler();
    }
    catch(err) {
        return messageError(err);
    }
};

// Add rules to subscription to only receive messages with a defined rule
const setRules = async subClient => {
    const rules = await subClient.getRules();

    for (let i = 0; i < rules.length; i++) {
        await subClient.removeRule(rules[i].name);
    }

    console.log(`Adding Subscription Rule - status-update`);

    await subClient.addRule('Status-Label', {
        label: 'status-update'
    });
};

// Create sub client with receiver and register message handler callback, than set subscription rules
const createMessageHandler = async () => {
    const subClient = sbClient.createSubscriptionClient(topicName, subscriptionName);

    subClient
        .createReceiver(ReceiveMode.receiveAndDelete)
        .registerMessageHandler(messageSuccess, messageError, {
            maxConcurrentCalls: 10
        });

    await setRules(subClient);
};

// Check/Create subscription client and reciever
const checkSubscription = () => {

    return new Promise((resolve, reject) => {

        sbService.getSubscription(topicName, subscriptionName, (e, resp) => {
            if (!resp) {
                sbService.createSubscription(topicName, subscriptionName, {
                    DefaultMessageTimeToLive: 'PT30S',
                    LockDuration: 'PT30S',
                    AutoDeleteOnIdle: autoDelete,
                    EnableDeadLetteringOnFilterEvaluationExceptions: false
                }, (err, res) => {

                    if (!err) {
                        console.log(`Subscription created - ${res.SubscriptionName}`);
                        return resolve(res);
                    } else {
                        console.error(`Subscription creation failed - ${err}`);
                        return reject(err);
                    }
                });
            } else {
                return resolve(resp);
            }
        });

    });
}

// Execute subscription methods and Start server on defined socket port
const startServer = async () => {

    try {
        await checkSubscription();
        await createMessageHandler();

        console.log(`Socket Server running at: localhost:3001 as ${process.env.NODE_ENV}`);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}

startServer();
