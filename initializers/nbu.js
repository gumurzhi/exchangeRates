var http = require('http');

module.exports = {
    initialize: function (api, next) {
        var dbc = api.maria;
        next();
        api.nbu = {
            getCurrencyByDate: function (date, currency, next) {
                api.log('getCurrencyByDate got startDate ' + date);
                api.log(currency);
                getTestPersonaLoginCredentials(date, currency, function (err,data) {
                    api.log('NBU answer: ' + JSON.stringify(data), 'info');
                    if(err) next(err);
                    else next(null, data);
                })
            }
        }
    }
};

function generateAnswer(err, data, next, api) {
    if (err) {
        api.log('getNames ERROR:' + err, 'error');
        next(err);
    } else {
        next(null, data);
    }
}


function getTestPersonaLoginCredentials(date, curency,callback) {
    date  = date? new Date(date): new Date;
    date = date.getUTCFullYear()+addZero((date.getMonth()+1))+ addZero(date.getDate());
    return http.get({
        host: 'bank.gov.ua',
        path: '/NBUStatService/v1/statdirectory/exchange/?valcode='+removeQuotes(curency)+'&date='+date+'&json'
    }, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            try{
            var parsed = JSON.parse(body);
            callback(null, parsed);
            } catch (err){
                callback({err: 'broken answer from server'});
            }
        });
        response.on('error', function (err) {
            callback(err);
        });

    });

}
function removeQuotes(str) {
    return str.replace(/\"|\'/g, '')
}

function addZero(str) {
    str = str+'';
    if(str.length == 1) str = '0'+str;
    return str;
}