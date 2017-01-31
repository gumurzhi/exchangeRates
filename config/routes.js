exports.default = {
  routes: function (api) {
    return {

      get: [
        { path: '/saveSomeData', action: 'getCurrencyByDateFromNbu' },
        { path: '/getNames', action: 'curNames' },
        { path: '/changes', action: 'getCurrencyChanges' },
        { path: '/getCurrency', action: 'getCurrentCurrency' }
      ],
      post: [
        { path: '/getNames', action: 'curNames' },
        { path: '/changes', action: 'getCurrencyChanges' },
        { path: '/getCurrency', action: 'getCurrentCurrency' }
      ]
    }
  }
};
