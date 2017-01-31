"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path="../typings/tsd.d.ts"/>
var amqp = require("amqplib");
var log4js_1 = require("log4js");
var Q = require("q");
var events_1 = require("events");
var uuid_1 = require("uuid");
var logger = log4js_1.getLogger('AmqpService');
var AmqpService = (function (_super) {
    __extends(AmqpService, _super);
    function AmqpService(uri) {
        _super.call(this);
        this.connFlag = false;
        this.connArr = [];
        this.chFlag = false;
        this.chArr = [];
        this.uri = uri;
        this.msgStore = {};
    }
    AmqpService.prototype.getConnect = function () {
        logger.trace('getConnect started');
        var deferred = Q.defer();
        var my = this;
        if (!this.connection) {
            logger.trace('no connection!');
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
                    logger.error(err);
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
        logger.trace('getChannel started');
        var deferred = Q.defer();
        var my = this;
        if (!my.channel) {
            if (!my.chFlag) {
                my.chFlag = true;
                logger.trace('no channel? :', my.channel);
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
                    logger.error(err);
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
            logger.debug('start listening q', qName);
            ch.consume(qName, function reply(msg) {
                generateAnswer(msg, handleData);
            });
        })
            .catch(function (err) {
            logger.error(err);
        });
        function generateAnswer(msg, handleData) {
            //  logger.trace('rpcServer started');
            var toClient;
            logger.trace('got message:', msg.content.toString());
            try {
                toClient = JSON.parse(msg.content.toString());
            }
            catch (err) {
                logger.error('something wrong with incoming data:', err);
                toClient = { error: 'something wrong with incoming data, try to do JSON.stringify' };
                my.sendRpcServerAnswer(toClient, msg);
            }
            if (!toClient.error) {
                handleData(toClient)
                    .then(function (answer) {
                    logger.trace('data handled, answer is:', answer);
                    my.sendRpcServerAnswer(answer, msg);
                })
                    .catch(function (err) {
                    logger.error(err);
                    toClient = { error: 'something wrong on handle data' };
                    my.sendRpcServerAnswer(toClient, msg);
                });
            }
        }
    };
    AmqpService.prototype.sendRpcServerAnswer = function (answer, msg) {
        var my = this;
        my.getChannel()
            .then(function (ch) {
            ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(answer)), { correlationId: msg.properties.correlationId });
            ch.ack(msg);
        })
            .catch(function (err) {
            logger.error(err);
        });
    };
    AmqpService.prototype.sendMsgRpcClient = function (qName, msg) {
        var deferred = Q.defer();
        try {
            msg = JSON.stringify(msg);
            logger.debug('try to send msg:', msg, 'to Q:', qName);
        }
        catch (err) {
            logger.error(err);
            deferred.reject({ error: err, msg: 'something wrong with incoming message' });
            return deferred.promise;
        }
        var my = this;
        my.getChannel()
            .then(function (ch) {
            ch.assertQueue('', { exclusive: true })
                .then(function (q) {
                var corr = uuid_1.v4();
                ch.consume(q.queue, function (msg) {
                    logger.trace('got message from ', q.queue);
                    if (my.msgStore[msg.properties.correlationId]) {
                        var amqpAnswer = JSON.parse(msg.content.toString());
                        logger.trace(' [.] Got: %s', amqpAnswer);
                        var tmpDefer = my.msgStore[msg.properties.correlationId];
                        tmpDefer.resolve(amqpAnswer);
                        delete my.msgStore[msg.properties.correlationId];
                        return deferred.promise;
                    }
                }, { noAck: true });
                my.msgStore[corr] = deferred;
                ch.sendToQueue(qName, new Buffer(msg), { correlationId: corr, replyTo: q.queue });
            })
                .catch(function (err) {
                logger.error(err);
            });
        })
            .catch(function (err) {
            logger.error('sendMsgRpcClient ERROR: ',err);
        });
        return deferred.promise;
    };
    AmqpService.prototype.publishToExchange = function (exName, msg) {
        var my = this;
        my.getChannel()
            .then(function (ch) {
            ch.assertExchange(exName, 'fanout');
            msg = JSON.stringify(msg);
            ch.publish(exName, '', new Buffer(msg));
            logger.info(" [x] Sent %s", msg);
        })
            .catch(function (err) {
            logger.error(err);
        });
    };
    
    AmqpService.prototype.listenExchange = function (ex, handleData) {
        var my = this;
        logger.debug('begin to listen exchange:', ex);
        my.getChannel()
            .then(function (ch) {
            ch.assertExchange(ex, 'fanout');
            ch.assertQueue('', { exclusive: true })
                .then(function (q) {
                logger.info('listening queue:', q.queue);
                ch.bindQueue(q.queue, ex, '');
                ch.consume(q.queue, function (msg) {
                    try {
                        var incMessage = JSON.parse(msg.content.toString());
                        logger.debug('got message:', incMessage);
                        handleData(incMessage);
                    }
                    catch (err) {
                        logger.error(err);
                    }
                }, { noAck: true });
            })
                .catch(function (err) {
                logger.error(err);
            });
        })
            .catch(function (err) {
            logger.error(err);
        });
    };
    
    AmqpService.prototype.sendToQueue = function (queue, msg) {
        var my = this;
        my.getChannel()
            .then(function (ch) {
            ch.assertQueue(queue);
            msg = JSON.stringify(msg);
            ch.sendToQueue(queue, new Buffer(msg), { persistent: true });
        })
            .catch(function (err) {
            logger.error('sendToQueue ERROR:', err);
        });
    };
    
    AmqpService.prototype.listenQueue = function (queue, handleData) {
        var my = this;
        my.getChannel()
            .then(function (ch) {
            ch.assertQueue(queue);
            ch.prefetch(1);
            ch.consume(queue, function (msg) {
                try {
                    var incMessage = JSON.parse(msg.content.toString());
                    logger.debug('got message:', incMessage);
                    handleData(incMessage);
                }
                catch (err) {
                    logger.error(err);
                }
            }, { noAck: true });
        })
            .catch(function (err) {
            logger.error(err);
        });
    };
    return AmqpService;
}(events_1.EventEmitter));
exports.AmqpService = AmqpService;
