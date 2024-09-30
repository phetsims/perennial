// Copyright 2024, University of Colorado Boulder

import buildtoolsEslintConfig from '../chipper/eslint/buildtools.eslint.config.mjs';
import nodeEslintConfig from '../chipper/eslint/node.eslint.config.mjs';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...nodeEslintConfig,
  buildtoolsEslintConfig
];