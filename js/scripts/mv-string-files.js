// Copyright 2022, University of Colorado Boulder
/**
 *
 * MS and CK are renaming string files to pascal case! See https://github.com/phetsims/simula-rasa/issues/26
 *
 * Run from sims root directory
 * USAGE:
 * cd ${root containing all repos}
 * node ./perennial/js/scripts/mv-string-files.js
 *
 * @author Marla Schulz (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

 
const fs = require( 'fs' );
const childProcess = require( 'child_process' ); // eslint-disable-line require-statement-match

// The repositories the script will iterate through to produce data
const repos = [
  'acid-base-solutions',
  'aqua',
  'area-builder',
  'area-model-algebra',
  'area-model-common',
  'area-model-decimals',
  'area-model-introduction',
  'area-model-multiplication',
  'arithmetic',
  'assert',
  'atomic-interactions',
  'axon',
  'balancing-act',
  'balancing-chemical-equations',
  'balloons-and-static-electricity',
  'bamboo',
  'beers-law-lab',
  'bending-light',
  'binder',
  'blackbody-spectrum',
  'blast',
  'brand',
  'build-a-fraction',
  'build-a-molecule',
  'build-a-nucleus',
  'build-an-atom',
  'bumper',
  'buoyancy',
  'calculus-grapher',
  'capacitor-lab-basics',
  'center-and-variability',
  'chains',
  'charges-and-fields',
  'chipper',
  'circuit-construction-kit-ac',
  'circuit-construction-kit-ac-virtual-lab',
  'circuit-construction-kit-black-box-study',
  'circuit-construction-kit-common',
  'circuit-construction-kit-dc',
  'circuit-construction-kit-dc-virtual-lab',
  'collision-lab',
  'color-vision',
  'concentration',
  'coulombs-law',
  'counting-common',
  'curve-fitting',
  'density',
  'density-buoyancy-common',
  'diffusion',
  'dot',
  'eating-exercise-and-energy',
  'energy-forms-and-changes',
  'energy-skate-park',
  'energy-skate-park-basics',
  'equality-explorer',
  'equality-explorer-basics',
  'equality-explorer-two-variables',
  'estimation',
  'example-sim',
  'expression-exchange',
  'faradays-law',
  'fluid-pressure-and-flow',
  'forces-and-motion-basics',
  'fourier-making-waves',
  'fraction-comparison',
  'fraction-matcher',
  'fractions-common',
  'fractions-equality',
  'fractions-intro',
  'fractions-mixed-numbers',
  'friction',
  'function-builder',
  'function-builder-basics',
  'gas-properties',
  'gases-intro',
  'gene-expression-essentials',
  'geometric-optics',
  'geometric-optics-basics',
  'graphing-lines',
  'graphing-quadratics',
  'graphing-slope-intercept',
  'gravity-and-orbits',
  'gravity-force-lab',
  'gravity-force-lab-basics',
  'greenhouse-effect',
  'griddle',
  'hookes-law',
  'interaction-dashboard',
  'inverse-square-law-common',
  'isotopes-and-atomic-mass',
  'john-travoltage',
  'joist',
  'kite',
  'least-squares-regression',
  'make-a-ten',
  'masses-and-springs',
  'masses-and-springs-basics',
  'mean-share-and-balance',
  'mobius',
  'models-of-the-hydrogen-atom',
  'molarity',
  'molecule-polarity',
  'molecule-shapes',
  'molecule-shapes-basics',
  'molecules-and-light',
  'my-solar-system',
  'natural-selection',
  'neuron',
  'nitroglycerin',
  'normal-modes',
  'number-line-common',
  'number-line-distance',
  'number-line-integers',
  'number-line-operations',
  'number-play',
  'ohms-law',
  'optics-lab',
  'pendulum-lab',
  'perennial',
  'perennial-alias',
  'ph-scale',
  'ph-scale-basics',
  'phet-core',
  'phet-io',
  'phet-io-test-sim',
  'phet-io-wrapper-classroom-activity',
  'phet-io-wrapper-haptics',
  'phet-io-wrapper-lab-book',
  'phet-io-wrappers',
  'phetcommon',
  'phetmarks',
  'plinko-probability',
  'projectile-motion',
  'proportion-playground',
  'quadrilateral',
  'quake',
  'query-string-machine',
  'ratio-and-proportion',
  'reactants-products-and-leftovers',
  'resistance-in-a-wire',
  'rosetta',
  'rutherford-scattering',
  'scenery',
  'scenery-phet',
  'sherpa',
  'shred',
  'simula-rasa',
  'skiffle',
  'states-of-matter',
  'states-of-matter-basics',
  'studio',
  'sun',
  'tambo',
  'tandem',
  'tangible',
  'tappi',
  'trig-tour',
  'twixt',
  'under-pressure',
  'unit-rates',
  'utterance-queue',
  'vector-addition',
  'vector-addition-equations',
  'vegas',
  'vibe',
  'wave-interference',
  'wave-on-a-string',
  'waves-intro',
  'weddell',
  'wilder',
  'xray-diffraction',
  'yotta'
];

const visit = path => {

  const entries = fs.readdirSync( path );

  entries.forEach( file => {
    if ( file.match( /^[a-zA-Z]+Strings\.ts$/ ) ) {
      const firstLetter = file[ 0 ];

      const pascalCaseFileName = firstLetter.toUpperCase() + file.slice( 1 );

      console.log( '' );
      console.log( file );
      console.log( pascalCaseFileName );

      childProcess.execSync( `git mv ./${file} ./${pascalCaseFileName}`, { cwd: path } );
    }
  } );
};

// iterate through list of repos to look for string files
repos.forEach( repo => {
  visit( `./${repo}/js` );
} );