
var options = {
    uri: 'amqp://guest:guest@localhost:5672',
    rpcQ: 'req'
};

exports.default = {
    servers: {
        amqp: function (api) {
         
            //var amqpService = new AmqpService(url);
            return {
                enabled: true,
                //hashtag: "sports",
                options: options
            }
        }
    }
};

