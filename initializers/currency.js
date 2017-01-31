var Q = require('q');
module.exports = {
    initialize: function (api, next) {
        var dbc = api.maria;
        checckCurNames(dbc)
            .then(function () {
                return checkCurValues(dbc);
            })
            .then(function () {
                api.log('database is OK');
                next();
            })
            .catch(function (err) {
                api.log('initialize ERROR: '+err, 'error');
            });

        api.currency = {
            getNames: function (next) {
                dbc.query('SELECT * FROM curNames', function (err, data) {
                    generateAnswer(err, data, next, api, 'getNames');
                })
            },
            getCurrencyByDate: function (startDate, endDate, currency, next) {
                dbc.query("SELECT * FROM curNames " +
                    "LEFT JOIN curValues ON curNames.id=curValues.cc " +
                    "WHERE (curValues.exchangeDate BETWEEN  '" + startDate + "' AND '" + endDate + "') AND" +
                    " (curNames.name='" + removeQuotes(currency) + "')", function (err, data) {
                    generateAnswer(err, data, next, api, 'getCurrencyByDate');
                })
            },

            updateValue: function (curElem, next) {
                curElem.exchangedate = formatDate(curElem.exchangedate);
                checkIfExist(curElem.exchangedate, curElem.cc)
                    .then(function (exists) {
                        api.log('exists:' + exists);
                        var queue = '';
                        if (exists) {
                            queue = 'UPDATE curValues SET rate=' + curElem.rate + ' ' +
                                'WHERE (exchangedate = "' + curElem.exchangedate + '") AND (cc=' + curElem.cc + ')'
                        } else {
                            queue = 'INSERT INTO curValues (r030, name, rate, cc, exchangedate)' +
                                'VALUES (' + curElem.r030 + ', "' + curElem.txt + '", ' + curElem.rate + ', ' + curElem.cc + ', "' + curElem.exchangedate + '")';
                        }
                        dbc.query(queue, function (err, data) {
                            if (err) {
                                api.log('updateValue ERROR: ' + err, 'error');
                                next(err);
                            } else if (data && data.info && data.info.affectedRows) {
                                next(null, 'updated')
                            } else {
                                next(null, 'not updated')
                            }
                            api.log('Data: ' + JSON.stringify(data));
                        })
                    })
                    .catch(function (err) {
                        api.log('updateValue ERROR: ' + err, 'error');
                    });

            },

            getCurrChanges: function (cur, startDate, endDate) {

            }
        };

        var checkIfExist = function (date, cc) {
            var deferred = Q.defer();
            dbc.query('SELECT * FROM curValues WHERE (cc=' + cc + ') AND (exchangedate= "' + date + '")', function (err, data) {
                if (err) deferred.reject(err);
                else if (data && data.info && data.info.numRows == 0) {
                    deferred.resolve(false);
                } else deferred.resolve(true);
            });

            return deferred.promise;
        };

        function formatDate(date) {
            try {
                var arr = date.split('.');
                return (arr[2] + '-' + arr[1] + '-' + arr[0]);
            } catch (err) {
                console.log(err);
                return (date);
            }
        }
    }
};

function removeQuotes(str) {
    return str.replace(/\"|\'/g, '')
}

function generateAnswer(err, data, next, api, methodName) {
    if (err) {
        api.log(methodName + ' ERROR:' + err, 'error');
        next(err);
    } else {
        next(null, data);
    }
}


function checckCurNames(dbc) {
    var q = 'CREATE TABLE IF NOT EXISTS curNames (' +
        'id INT(11) NOT NULL AUTO_INCREMENT, ' +
        'name VARCHAR(45) DEFAULT NULL,' +
        'PRIMARY KEY (id))';

    var deferred = Q.defer();
    dbc.query(q, function (err, data) {
        if (err) deferred.reject(err);
        else {
            dbc.query("SELECT * FROM curNames", function (err, data) {
                if(err) deferred.reject(err);
                else if(data && data[0] && data[0].id){
                    deferred.resolve(true);
                } else {
                    setCurnamesDefaultData(dbc, deferred);
                }
            });

        }
    });
    return deferred.promise;
}

function setCurnamesDefaultData(dbc, deferred) {
    var q = 'INSERT INTO curNames(name) VALUES ("EUR"),("USD")';
    dbc.query(q, function (err, data) {
        console.log('insert', data);
        deferred.resolve(true);
    });
}

function checkCurValues(dbc) {
    var deferred = Q.defer();
    var q = "CREATE TABLE IF NOT EXISTS curValues (" +
        "id BIGINT(20) NOT NULL AUTO_INCREMENT, " +
        "r030 INT(11), " +
        "name VARCHAR(45) DEFAULT NULL, " +
        "cc INT(11), " +
        "exchangeDate DATE DEFAULT NULL, " +
        "rate DOUBLE, " +
        "PRIMARY KEY (id))";

    dbc.query(q, function (err, data) {
        if (err) deferred.reject(err);
        else {
            deferred.resolve(true);
        }
    });
    return deferred.promise;
}