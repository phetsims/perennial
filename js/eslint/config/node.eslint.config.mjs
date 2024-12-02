// Copyright 2018, University of Colorado Boulder
// @author Michael Kauzmann

import rootEslintConfig from './root.eslint.config.mjs';
import getNodeConfiguration from './util/getNodeConfiguration.mjs';

/**
 * The config file to use for node-based code.
 * NOTE: Code should NOT be added here!! Instead, add new configuration to `getNodeConfiguration` for reuse.
 * @author Michael Kauzmann (PhET Interactive Simulations
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default [
  ...rootEslintConfig,
  ...getNodeConfiguration()
];