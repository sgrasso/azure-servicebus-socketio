const { ServiceBusClient, ReceiveMode } = require('@azure/service-bus');
const ServiceBusService = require('azure-sb');

// Create connection to Service Bus
let sbClient = null;
let sbService = null;

// Add rules to subscription to only receive messages with a defined rule
const setRules = async (rules, topicName, subscriptionName) => {
    const subClient = sbClient.createSubscriptionClient(topicName, subscriptionName);
    const subRules = await subClient.getRules();

    console.log(`Adding Subscription Rule`);

    for (let i = 0; i < subRules.length; i++) {
        await subClient.removeRule(subRules[i].name);
    }
    for (let ii = 0; ii < rules.length; ii++) {
        await subClient.addRule(rules[ii].name, rules[ii].rule);
    }
};

// Create sub client with receiver and register message handler callback, than set subscription rules
const createMessageHandler = async (topicName, subscriptionName, messageSuccess, messageError, messageOptions) => {
    const subClient = sbClient.createSubscriptionClient(topicName, subscriptionName);

    subClient
        .createReceiver(ReceiveMode[messageOptions.receiveMode])
        .registerMessageHandler(messageSuccess, messageError, messageOptions.handler);
};

// Check/Create subscription client and reciever
const checkSubscription = (subscriptionName, topicName, subOptions) => {

    return new Promise((resolve, reject) => {
        sbService.getSubscription(topicName, subscriptionName, (e, resp) => {
            if (!resp) {
                sbService.createSubscription(topicName, subscriptionName, subOptions, (err, res) => {
                    if (!err) {
                        console.log(`Subscription created - ${res.SubscriptionName}`);
                        return resolve(true);
                    } else {
                        console.error(`Subscription creation failed - ${err}`);
                        return reject(err);
                    }
                });
            } else {
                return resolve(false);
            }
        });
    });
}

const connect = async connectionString => {
    sbClient = ServiceBusClient.createFromConnectionString(connectionString);
    sbService = ServiceBusService.createServiceBusService(connectionString);

    return { sbClient, sbService };
}

module.exports = {
    checkSubscription,
    connect,
    createMessageHandler,
    setRules
}
