'use strict';

module.exports = {
  ...require('./surfaces'),
  ...require('./stack'),
  ...require('./profile'),
  ...require('./pipeline'),
  ...require('./cognitive-architecture'),
  ...require('./canonical-architecture'),
  ...require('./canonical-cognitive-bridge'),
  prepareCanonicalExecution: require('./canonical-runtime').prepareCanonicalExecution,
  deriveExecutionRoute: require('./canonical-route').deriveExecutionRoute,
  lowerToCanonical: require('./canonical-lower').lowerToCanonical
};
