

exports.getCurrencyByDateFromNbu = {
    name: 'getCurrencyByDateFromNbu',
    description: 'I get currency from NBU',
    authenticated: false,
    outputExample: [{id: 1, name: 'UAH'}],
    inputs: {
        currency: {required: true},
        startDate: {required: false}
    },
    version: 1.0,
    run: function (api, data, next) {
        var date = data.params.startDate? new Date(data.params.startDate) : new Date();
        api.nbu.getCurrencyByDate(date, data.params.currency, function (error, answer) {
            data.response = answer;
            next(error);

        })
    }
};

exports.saveCur = {
    name: 'saveCur',
    description: 'I get currency from NBU',
    authenticated: false,
    outputExample: 'updated',
    version: 1.0,
    run: function (api, data, next) {
        api.currency.updateValue({}, function (error, answer) {
            data.response = answer;
            next(error);

        })
    }
};
