'use strict'

exports.task = {
  name: 'getFreshCurrency',
  description: 'My Task',
  frequency: 2,
  queue: 'default',
  middleware: [],

  run: function (api, params, next) {
    // your logic here
    next (null, 'resultLogMessage')
  }
};
