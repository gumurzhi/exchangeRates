var AmqpService = require('./AmqpService').AmqpService,
    amqpService = new AmqpService('amqp://guest:guest@localhost:5672');

amqpService.sendMsgRpcClient('req', {currency: "EUR", startDate: '2017-01-30', endDate: '2017-01-30', action: 'getCurrentCurrency'})
    .then(function (answer) {
        console.log(answer);
    })
    .catch(function (err) {
        console.log('ERROR', err);
    });