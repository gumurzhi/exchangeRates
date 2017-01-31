var options = {
    host: '127.0.0.1',
    user: 'root',
    password: '12',
    db: 'currency'
};
var Client = require('mariasql');
var c = new Client(options);

exports.default = {
    currencyDB: function (api) {
        api.maria = c;
        //return currencyDB;

    }
};
