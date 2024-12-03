// Copyright 2024, University of Colorado Boulder


import { perennialRules } from '../../eslint.config.mjs';
import browserAndNodeEslintConfig from '../eslint/config/browser-and-node.eslint.config.mjs';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...browserAndNodeEslintConfig,
  perennialRules
];