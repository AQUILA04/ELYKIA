const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      crypto:   require.resolve('crypto-browserify'),
      stream:   require.resolve('stream-browserify'),
      buffer:   require.resolve('buffer/'),
      vm:     require.resolve('vm-browserify')
    }
  },
  plugins: [
    // inject global variables that the polyfills expect
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer:  ['buffer', 'Buffer']
    })
  ]
};
