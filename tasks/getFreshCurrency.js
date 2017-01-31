exports.task = {
    name: "getFreshCurrency",
    queue: 'default',
    description: "I do stuff",
    frequency: 5,
    run: function(api, params, next){
        // email sending stub
        console.log('ssdsdsds');
    }
}