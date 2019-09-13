# Azure Service Bus with Node SocketIO

A SocketIO server for real-time messaging between an Azure Service Bus topic and a frontend UI.

## Overview

A connected user will receive real-time notifications through a Azure Service Bus Topic subscription.  This is possible by using a small Node.js [socket.io](https://socket.io) server interacting with an Azure Service Bus using the [@azure/service-bus](https://www.npmjs.com/package/@azure/service-bus) and [azure-sb](https://www.npmjs.com/package/azure-sb) packages.

The following ENV variables are required.

> `AZURE_SERVICEBUS_CONNECTION_STRING`
>
> `AZURE_SERVICEBUS_TOPIC_NAME`
>
> `HOSTNAME`

Each user will create a socket connection with process

At runtime the process will create a unique subscription within the defined service bus topic using the HOSTNAME of the container or a uuid if HOSTNAME does not exist.

Rules will be added to the subscription for all configured rules determining which events the created subscription will filter and receive.

## Subscription Connection

Socket Server runs on the defined `process.env.PORT` value or by default `3001` - `localhost:{port}`

The following options are pass when creating a connection with the Service Bus Topic

``` js
{
    DefaultMessageTimeToLive: 'PT30S',
    LockDuration: 'PT30S',
    AutoDeleteOnIdle: (process.env.NODE_ENV === 'production') ? 'PT24H' : 'PT5M'
}
```

Message time to live and lock durations is 30 seconds.  Messages should be picked up immediately by a process otherwise you missed it so move on.
The AutoDeleteOnIdle guarentees that a subscription connection will not live forever and if goes idle will be deleted from the service bus topic. A Socket server will always check for a subscription prior to starting up and create one if it doesn't exist or uses an existing.

## Message Configuration

After appling the configured rules to the subscription a messsage handler will be created.  The following options are provided

``` js
{
    receiveMode: 'receiveAndDelete',
    handler: {
        maxConcurrentConnections: 10
    }
}
```

Once a message is picked up from a subscription it will immediately be deleted since each subscription is unique to its process/hostname. We set max concurrent connections as a best practice to 10.

## Subscription Rules

Rules can be added to the imported array.  All rules on a subscription will be removed prior to looping and apply each of the configured rules passed. If you wish to add more rules refer to the documentation for ASB subscritions rules for the format.

``` js
[
    {
        name: 'example-rule',
        rule: {
            label: 'example-rule' // Only accept messages with a label of 'example-rule'
        }
    }
]
```

## Socket Add-User

The socket server will listen for event messages of `add-user`. This event will trigger the server to add the passed user to it's client object.  This object is simply a `user:socketId` relationship. On a disconnect event the socketId emitted is removed from the client object.

When you send a message to the Service Bus Topic be sure to include a user that would be expecting the message.  If the socket server has that user it will emit the message directly to that socketID. Otherwise, no message is emitted. When the client connects to the back-end socket server on success ('connected') the client should emit an `add-user` message identifing the connected user.

``` js
connnectUserSocket =  async user => {
    const socket = (process.env.NODE_ENV === 'production') ? io({ transports: ['websocket'] }) : io(`http://localhost:3001`, { transports: ['websocket'] });

    socket.on('connected', m => {
        socket.emit('add-user', user.preferred_username);
    });

    socket.on('example-update', m => {
        this.props.receivedExampleUpdates(m); // Do something...
    });

    return socket;
}
```


