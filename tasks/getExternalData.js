'use strict'

exports.task = {
    name: 'getExternalData',
    description: 'My Task',
    frequency: 10,
    queue: 'default',
    middleware: [],

    run: function (api, params, next) {
        // your logic here
        //  next (null, 'sdsdsds' )
        var count = 0;
        var answerObj = {};
        var to = setTimeout(function () {
            next(null, 'finished by timeout')
        }, 5000);
        api.currency.getNames(function (err, data) {
            if (err) next(err);
            else {
                api.log('names: ' + JSON.stringify(data));
                data = data.map(function (cell) {
                    if (cell && cell.id) return cell;
                });
                data.forEach(function (cell) {
                    answerObj[cell.name] = '';
                    makeUpdate(api,cell, function (err, answer) {
                        count++;
                        if (err) answerObj[err.name] = err.msg;
                        else answerObj[answer.name] = answer.msg;
                        if (count == data.length) {
                            clearTimeout(to);
                            next(null, answerObj);
                        }
                    })
                });
            }
        });
    }
};

function makeUpdate(api, elem, callback) {
    api.nbu.getCurrencyByDate(null, elem.name, function (err, data) {
        api.log('nbu answer ' + data);
        if (err) {
            api.log('getCurrencyByDate ERROR: ', err);
            callback({name: elem.name, msg: err});
        } else if (data && data.length) {
            data[0].cc = elem.id;
            api.currency.updateValue(data[0], function (err, data) {
                if (err) {
                    api.log('getCurrencyByDate updateValue ERROR: ', err);
                    callback({name: elem.name, msg: err});
                } else callback({name: elem.name, msg: data});
            })
        } else {
            callback({name: elem.name, msg: 'no data returned from nbu'});
        }
    })
}