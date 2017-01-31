var amqp = require("amqplib");
var Q = require('q');

var initialize = function (api, options, next) {
    // ////////
    // INIT //
    // ////////

    var type = 'default';
    var attributes = {};

    var server = new api.GenericServer(type, options, attributes);
    api.log('init rabbitMQ service', 'debug');
    var amqpService = new AmqpService(api.config.servers.amqp.options.uri);
    // ////////////////////
    // REQUIRED METHODS //
    // ////////////////////
    server.start = function (next) {
        api.log('starting RPC', 'debug');
        amqpService.startRpcServer(api.config.servers.amqp.options.rpcQ, function (data, msg) {
            var deferred = Q.defer();

            server.buildConnection({
                rawConnection: {
                    msg: msg,
                    params: data
                },
                remoteAddress: 0,
                remotePort: 0
            });
            return deferred.promise;

        });


        next()
    };
    server.stop = function (next) {
        amqpService.getConnect()
            .then(function (conn) {
                conn.close();
            })
            .catch(function (err) {
                api.log('server.stop ERROR: ' + err, 'error');
            });
        next();
    };

    // //////////
    // EVENTS //
    // //////////

    server.on('connection', function (connection) {
        if (connection.rawConnection.params.action && connection.rawConnection.params.currency) {
            connection.params = {
                //  pass here params for action
                currency: connection.rawConnection.params.currency,
                action: connection.rawConnection.params.action
            };
            if (connection.rawConnection.params.startDate) connection.params.startDate = connection.rawConnection.params.startDate;
            if (connection.rawConnection.params.endDate) connection.params.endDate = connection.rawConnection.params.endDate;
            server.processAction(connection);
            connection.error = null;
            connection.response = {};
        } else {
            connection.error = 'wrong metadata';
            amqpService.sendRpcServerAnswer({error: 'wrong incoming data'}, connection.rawConnection.msg);
        }
    });
    server.on('actionComplete', function (data) {
        if (data.toRender !== false) {
            amqpService.sendRpcServerAnswer(data.response, data.connection.rawConnection.msg);
        }
    });

    // ///////////
    // HELPERS //
    // ///////////

    next(server)


};

// ///////////////////////////////////////////////////////////////////
// exports
exports.initialize = initialize;


var AmqpService = function (uri) {
    this.connFlag = false;
    this.connArr = [];
    this.chFlag = false;
    this.chArr = [];
    this.uri = uri;
};

AmqpService.prototype.getConnect = function () {
    //  api.log('getConnect started', 'info');
    var deferred = Q.defer();
    var my = this;
    if (!this.connection) {
        if (!my.connFlag) {
            my.connFlag = true;
            amqp.connect(this.uri)
                .then(function (conn) {
                    my.connection = conn;
                    for (var i = 0; i < my.connArr.length; i++) {
                        my.connArr[i].resolve(conn);
                    }
                    deferred.resolve(conn);
                })
                .catch(function (err) {
                    console.log('getConnect ' + err, 'error');
                    deferred.reject(err);
                });
        }
        else {
            my.connArr.push(deferred);
        }
    }
    else {
        deferred.resolve(my.connection);
    }
    return deferred.promise;
};

AmqpService.prototype.getChannel = function () {
   // console.log('getChannel started', 'debug');
    var deferred = Q.defer();
    var my = this;
    if (!my.channel) {
        if (!my.chFlag) {
            my.chFlag = true;
            //                api.log('no channel? : '+ my.channel, 'debug');
            my.getConnect()
                .then(function (conn) {
                    return conn.createChannel();
                })
                .then(function (ch) {
                    my.channel = ch;
                    for (var i = 0; i < my.chArr.length; i++) {
                        my.chArr[i].resolve(ch);
                    }
                    deferred.resolve(ch);
                })
                .catch(function (err) {
                    console.log('getChannel ' + err, 'error');
                    deferred.reject(err);
                });
        }
        else {
            my.chArr.push(deferred);
        }
    }
    else {
        deferred.resolve(my.channel);
    }
    return deferred.promise;
};

AmqpService.prototype.startRpcServer = function (qName, handleData) {
    var my = this;
    my.getChannel()
        .then(function (ch) {
            ch.assertQueue(qName); //, {durable: false});
            ch.prefetch(1);
            //    console.log('start listening q '+ qName, 'debug');
            ch.consume(qName, function reply(msg) {
                generateAnswer(msg, handleData);
            });
        })
        .catch(function (err) {
            console.log(err, 'error');
        });
    function generateAnswer(msg, handleData) {
        var toClient;
        console.log('got message: ' + msg.content.toString(), 'debug');
        try {
            toClient = JSON.parse(msg.content.toString());
        }
        catch (err) {
            console.log('something wrong with incoming data: ' + err, 'error');
            toClient = {error: 'something wrong with incoming data, try to do JSON.stringify'};
            my.sendRpcServerAnswer(toClient, msg);
        }
        if (!toClient.error) {
            handleData(toClient, msg);
        }
    }
};

AmqpService.prototype.sendRpcServerAnswer = function (answer, msg) {
    var my = this;
    my.getChannel()
        .then(function (ch) {
            ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(answer)), {correlationId: msg.properties.correlationId});
            ch.ack(msg);
        })
        .catch(function (err) {
            console.log(err, 'error');
        });
};

