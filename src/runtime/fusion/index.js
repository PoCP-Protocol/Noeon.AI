'use strict';

module.exports = {
  collectFusionBlocks: require('./unified-fusion').collectFusionBlocks,
  detectFusionPlan: require('./unified-fusion').detectFusionPlan,
  runUnifiedFusion: require('./unified-fusion').runUnifiedFusion,
  runFusionPreview: require('./fusion-preview').runFusionPreview,
  formatFusionPreviewText: require('./fusion-preview').formatFusionPreviewText,
  runFusionTriad: require('./fusion-triad').runFusionTriad,
  runFusionGraph: require('./fusion-graph').runFusionGraph,
  recordFusionRun: require('./fusion-history').recordFusionRun
};
