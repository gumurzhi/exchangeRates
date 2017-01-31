exports.curNames = {
    name: 'curNames',
    description: 'I get currency names',
    authenticated: false,
    outputExample: [{id: 1, name: 'UAH'}],
    version: 1.0,
    run: function (api, data, next) {
        var cacheKey = 'currKeys';
        api.cache.load(cacheKey, function (err, cacheData) {
            if (err || !cacheData) {
                api.currency.getNames(function (error, names) {
                    data.response.names = names;
                    console.log('taking data from DB');
                    saveCache(cacheKey, 1000, names, api);
                    next(error);
                })
            } else {
                data.response.names = cacheData;
            }
        })
    }
};

exports.getCurrentCurrency = {
    name: 'getCurrentCurrency',
    description: 'get currency for current time',
    authenticated: false,
    outputExample: [{
        "id": 1,
        "r030": 978,
        "name": "Євро",
        "cc": 1,
        "exchangeDate": "2017-01-28T00:00:00.000Z",
        "rate": 8
    }],
    inputs: {
        currency: {required: true},
        startDate: {required: false}
    },
    version: 1.0,
    run: function (api, data, next) {
        api.log(data.params.startDate);
        var now = data.params.startDate ? new Date(data.params.startDate) : new Date();
        var hStr = formatDate(now, api.log);
        var cacheKey = 'getCurrentCurrency'+JSON.stringify(data.params);
        api.cache.load(cacheKey, function (err, cacheData) {
            if (err || !cacheData) {
                api.currency.getCurrencyByDate(hStr, hStr, data.params.currency, function (error, currs) {
                    data.response = currs;
                    saveCache(cacheKey, 1000, currs, api);
                    next(error);
                })
            } else {
                data.response.names = cacheData;
            }
        })
    }
};

exports.getCurrencyChanges = {
    name: 'getCurrencyChanges',
    description: 'get currency changes for some time interval',
    authenticated: false,
    outputExample: [
        {"2017-01-28": "29.117992401123047"}],
    inputs: {
        currency: {required: true},
        startDate: {required: true},
        endDate: {required: true}
    },
    version: 1.0,
    run: function (api, data, next) {
        api.log('PARAMS: ' + data.params);
        var startDate = formatDate(data.params.startDate ? new Date(data.params.startDate) : new Date(), api.log);
        var endDate = formatDate(data.params.endDate ? new Date(data.params.endDate) : new Date(), api.log);

        api.currency.getCurrencyByDate(startDate, endDate, data.params.currency, function (error, curArr) {
            data.response = curArr.map(function (cell) {
                return {[formatDate(cell.exchangeDate, api.log)]: cell.rate}
            });
            next(error);
        })
    }
};

function formatDate(date, log) {
    if (date instanceof Date == false) {
        try {
            date = new Date(date);
        } catch (err) {
            log('Wrong date format!', 'error');
            date = new Date();
        }
    }
    return date.getFullYear() + '-' + date.getMonth() + 1 + '-' + date.getDate();
}

function saveCache(key, expireTime, data, api) {
    api.cache.lock(key, expireTime, function (err, lockOk) {
        if (lockOk) {
            api.cache.save(key, data, expireTime, function (error, newObject) {
                api.cache.unlock(key, function (error, lockOk) {

                });
            })
        }
    });
}

