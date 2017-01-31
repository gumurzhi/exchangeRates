'use strict'
var Q = require('q');
exports.task = {
    name: 'getExternalDatazxcxc',
    description: 'My Task',
    frequency: 100,
    queue: 'default',
    middleware: [],

    run: function (api, params, next) {
        // your logic here
        getNames(api)
            .then(function (names) {
                var procArr = [];
                names.forEach(function (cell) {
                    procArr.push(makeUpdate(api, cell));
                });
                return Q.all(procArr);
            })
            .then(function (answer) {
                next(null, answer)
            })
            .catch(function (err) {
                api.log("getNames ERROR: " + err, 'error');
                next(err);
            });
    }
};

function getNames(api) {
    var deferred = Q.defer();
    api.currency.getNames(function (err, data) {
        if (err) deferred.reject(err);
        else {
            api.log('names: ' + JSON.stringify(data));
            data = data.map(function (cell) {
                if (cell && cell.id) return cell;
            });
            console.log('newData: ', JSON.stringify(data));
            deferred.resolve(data);
        }
    });
    return deferred.promise;
}


function makeUpdate(api, elem) {
    var deferred = Q.defer();
    api.nbu.getCurrencyByDate(null, elem.name, function (err, data) {
        api.log('nbu answer ' + JSON.stringify(data));
        if (err) {
            api.log('getCurrencyByDate ERROR: ', err);
            deferred.reject(false);
        } else if (data && data.length) {
            data[0].cc = elem.id;
            api.currency.updateValue(data[0], function (err, data) {
                if (err) {
                    api.log('getCurrencyByDate updateValue ERROR: ', err);
                    deferred.reject(false);
                } else deferred.resolve(true);
            })
        } else {
            deferred.resolve(false);
        }
    });
    return deferred.promise;
}