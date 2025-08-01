const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://test.mosquitto.org');

client.on('connect', () => {
    client.subscribe('grumpykai-test-energy', (err) => {
        if (!err) {
            client.publish('grumpykai-test-energy', 'Hello mqtt');
        }
    });
});

client.on('message', (topic, message) => {
    console.log(message.toString());
    client.end();
});