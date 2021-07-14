// Copyright 2020, University of Colorado Boulder

/**
 * This prints out (in JSON form) the tests and operations requested for continuous testing for whatever is in master
 * at this point.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */


const getActiveRepos = require( './common/getActiveRepos' );
const getRepoList = require( './common/getRepoList' );
const fs = require( 'fs' );

const repos = getActiveRepos();
const phetioRepos = getRepoList( 'phet-io' );
const phetioAPIStableRepos = getRepoList( 'phet-io-api-stable' );
const runnableRepos = getRepoList( 'active-runnables' );
const interactiveDescriptionRepos = getRepoList( 'interactive-description' );
const phetioNoState = getRepoList( 'phet-io-state-unsupported' );
const unitTestRepos = getRepoList( 'unit-tests' );

/**
 * {Array.<Object>} test
 * {string} type
 * {string} [url]
 * {string} [repo]
 * {string} [queryParameters]
 * {string} [testQueryParameters]
 * {boolean} [es5]
 * {string} [brand]
 * {number} [priority=1] - higher priorities are tested more eagerly
 * {Array.<string>} buildDependencies
 */
const tests = [];

tests.push( {
  test: [ 'perennial', 'lint-everything' ],
  type: 'lint-everything',
  priority: 100
} );

// phet and phet-io brand builds
[
  ...runnableRepos,
  'scenery',
  'kite',
  'dot'
].forEach( repo => {
  tests.push( {
    test: [ repo, 'build' ],
    type: 'build',
    brands: phetioRepos.includes( repo ) ? [ 'phet', 'phet-io' ] : [ 'phet' ],
    repo: repo,
    priority: 1
  } );
} );

// lints
repos.forEach( repo => {
  if ( fs.existsSync( `../${repo}/Gruntfile.js` ) ) {
    tests.push( {
      test: [ repo, 'lint' ],
      type: 'lint',
      repo: repo,
      priority: 8
    } );
  }
} );

runnableRepos.forEach( repo => {
  tests.push( {
    test: [ repo, 'fuzz', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000'
  } );

  tests.push( {
    test: [ repo, 'xss-fuzz' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzz&stringTest=xss&memoryLimit=1000',
    testQueryParameters: 'duration=40000',
    priority: 0.3
  } );

  tests.push( {
    test: [ repo, 'fuzz', 'unbuilt', 'assertSlow' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&eall&fuzz&memoryLimit=1000',
    priority: 0.001
  } );

  tests.push( {
    test: [ repo, 'multitouch-fuzz', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzz&fuzzPointers=2&memoryLimit=1000&supportsPanAndZoom=false'
  } );

  tests.push( {
    test: [ repo, 'pan-and-zoom-fuzz', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzz&fuzzPointers=2&memoryLimit=1000&supportsPanAndZoom=true',
    priority: 0.5 // test this when there isn't other work to be done
  } );

  tests.push( {
    test: [ repo, 'fuzz', 'built' ],
    type: 'sim-test',
    url: `${repo}/build/phet/${repo}_en_phet.html`,
    queryParameters: 'fuzz&memoryLimit=1000',
    testQueryParameters: 'duration=80000',

    // We want to elevate the priority so that we get a more even balance (we can't test these until they are built,
    // which doesn't happen always)
    priority: 2,

    brand: 'phet',
    buildDependencies: [ repo ],
    es5: true
  } );

  if ( phetioRepos.includes( repo ) ) {
    tests.push( {
      test: [ repo, 'fuzz', 'built-phet-io' ],
      type: 'sim-test',
      url: `${repo}/build/phet-io/${repo}_all_phet-io.html`,
      queryParameters: 'fuzz&memoryLimit=1000&phetioStandalone',
      testQueryParameters: 'duration=80000',

      brand: 'phet-io',
      buildDependencies: [ repo ],
      es5: true
    } );
  }
} );

phetioRepos.forEach( repo => {

  tests.push( {
    test: [ repo, 'phet-io-fuzz', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'ea&brand=phet-io&phetioStandalone&fuzz&memoryLimit=1000'
  } );

  // Test for API compatibility, for sims that support it
  phetioAPIStableRepos.includes( repo ) && tests.push( {
    test: [ repo, 'phet-io-api-compatibility', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    // TODO: replace 0 with 332211 again once https://github.com/phetsims/phet-io/issues/1799 is sorted out
    queryParameters: 'ea&brand=phet-io&phetioStandalone&phetioCompareAPI&randomSeed=0', // NOTE: DUPLICATION ALERT: random seed must match that of API generation, see generatePhetioMacroAPI.js
    priority: 1.5 // more often than the average test
  } );

  // fuzz test important wrappers
  tests.push( {
    test: [ repo, 'phet-io-studio-fuzz', 'unbuilt' ],
    type: 'wrapper-test',
    url: `studio/?sim=${repo}&phetioDebug&fuzz`,
    testQueryParameters: 'duration=60000'
  } );

  // only test state on phet-io sims that support it
  phetioNoState.indexOf( repo ) === -1 && tests.push( {
    test: [ repo, 'phet-io-state-fuzz', 'unbuilt' ],
    type: 'wrapper-test',
    url: `phet-io-wrappers/state/?sim=${repo}&phetioDebug&fuzz`,
    testQueryParameters: 'duration=60000'
  } );

  tests.push( {
    test: [ repo, 'phet-io-mirror-inputs-fuzz', 'unbuilt' ],
    type: 'wrapper-test',
    url: `phet-io-wrappers/mirror-inputs/?sim=${repo}&phetioDebug&fuzz`,
    testQueryParameters: 'duration=60000'
  } );

  // phet-io wrappers tests for each PhET-iO Sim
  [ false, true ].forEach( useAssert => {
    tests.push( {
      test: [ repo, 'phet-io-wrappers-tests', useAssert ? 'assert' : 'no-assert' ],
      type: 'qunit-test',
      url: `phet-io-wrappers/phet-io-wrappers-tests.html?sim=${repo}${useAssert ? '&phetioDebug' : ''}`
    } );
  } );
} );

// accessible tests
interactiveDescriptionRepos.forEach( repo => {
  tests.push( {
    test: [ repo, 'interactive-description-fuzz', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzz&supportsInteractiveDescription=true&memoryLimit=1000',
    testQueryParameters: 'duration=40000'
  } );

  tests.push( {
    test: [ repo, 'interactive-description-fuzzBoard', 'unbuilt' ],
    type: 'sim-test',
    url: `${repo}/${repo}_en.html`,
    queryParameters: 'brand=phet&ea&fuzzBoard&supportsInteractiveDescription=true&memoryLimit=1000',
    testQueryParameters: 'duration=40000'
  } );

  tests.push( {
    test: [ repo, 'interactive-description-fuzz', 'built' ],
    type: 'sim-test',
    url: `${repo}/build/phet/${repo}_en_phet.html`,
    queryParameters: 'fuzz&supportsInteractiveDescription=true&memoryLimit=1000',
    testQueryParameters: 'duration=40000',

    brand: 'phet',
    buildDependencies: [ repo ],
    es5: true
  } );

  tests.push( {
    test: [ repo, 'interactive-description-fuzzBoard', 'built' ],
    type: 'sim-test',
    url: `${repo}/build/phet/${repo}_en_phet.html`,
    queryParameters: 'fuzzBoard&supportsInteractiveDescription=true&memoryLimit=1000',
    testQueryParameters: 'duration=40000',

    brand: 'phet',
    buildDependencies: [ repo ],
    es5: true
  } );
} );

// repo-specific Unit tests (unbuilt mode) from `grunt generate-test-harness`
unitTestRepos.forEach( repo => {
  // Skip phet-io-wrappers unit tests here, we run it with multiple repos above
  if ( repo === 'phet-io-wrappers' ) {
    return;
  }

  // All tests should work with no query parameters, with assertions enabled, and should support PhET-iO also, so test
  // with brand=phet-io
  const queryParameters = [ '', '?ea', '?brand=phet-io', '?ea&brand=phet-io' ];
  queryParameters.forEach( queryString => {

    // Don't test phet-io or tandem unit tests in phet brand, they are meant for phet-io brand
    if ( ( repo === 'phet-io' || repo === 'tandem' ) && !queryString.includes( 'phet-io' ) ) {
      return;
    }
    tests.push( {
      test: [ repo, 'top-level-unit-tests', `unbuilt${queryString}` ],
      type: 'qunit-test',
      url: `${repo}/${repo}-tests.html${queryString}`
    } );
  } );
} );

// Page-load tests (non-built)
[
  {
    repo: 'dot',
    urls: [
      '', // the root URL
      'tests/',
      'tests/playground.html'
    ]
  },
  {
    repo: 'kite',
    urls: [
      '', // the root URL
      'tests/playground.html',
      'tests/visual-shape-test.html'
    ]
  },
  {
    repo: 'scenery',
    urls: [
      '', // the root URL
      'tests/',
      'tests/playground.html',
      'tests/renderer-comparison.html?renderers=canvas,svg,dom',
      'tests/text-quality-test.html'
    ]
  }
].forEach( ( { repo, urls } ) => {
  urls.forEach( pageloadRelativeURL => {
    tests.push( {
      test: [ repo, 'pageload', `/${pageloadRelativeURL}` ],
      type: 'pageload-test',
      url: `${repo}/${pageloadRelativeURL}`,
      priority: 4 // Fast to test, so test them more
    } );
  } );
} );

// Page-load tests (built)
[
  {
    repo: 'dot',
    urls: [
      'doc/',
      'examples/',
      'examples/convex-hull-2.html'
    ]
  },
  {
    repo: 'kite',
    urls: []
  },
  {
    repo: 'scenery',
    urls: [
      'doc/',
      'doc/a-tour-of-scenery.html',
      'doc/accessibility/accessibility.html',
      'doc/implementation-notes.html',
      'doc/user-input.html',
      'examples/',
      'examples/cursors.html',
      'examples/hello-world.html',
      'examples/input-multiple-displays.html',
      'examples/input.html',
      'examples/mouse-wheel.html',
      'examples/multi-touch.html',
      'examples/nodes.html',
      'examples/shapes.html',
      'examples/sprites.html',
      // 'examples/webglnode.html', // currently disabled, since it fails without webgl
      'tests/text-bounds-comparison.html'
    ]
  }
].forEach( ( { repo, urls } ) => {
  urls.forEach( pageloadRelativeURL => {
    tests.push( {
      test: [ repo, 'pageload', `/${pageloadRelativeURL}` ],
      type: 'pageload-test',
      url: `${repo}/${pageloadRelativeURL}`,
      priority: 5, // When these are built, it should be really quick to test

      brand: 'phet',
      buildDependencies: [ repo ],
      es5: true
    } );
  } );
} );

//----------------------------------------------------------------------------------------------------------------------
// Public query parameter tests
//----------------------------------------------------------------------------------------------------------------------

// test non-default public query parameter values to make sure there are no obvious problems.
const commonQueryParameters = {
  allowLinksFalse: 'brand=phet&fuzz&memoryLimit=1000&ea&allowLinks=false',
  screens1: 'brand=phet&fuzz&memoryLimit=1000&ea&screens=1',
  screens21: 'brand=phet&fuzz&memoryLimit=1000&ea&screens=2,1',
  screens21NoHome: 'brand=phet&fuzz&memoryLimit=1000&ea&screens=2,1&homeScreen=false',
  initialScreen2NoHome: 'brand=phet&fuzz&memoryLimit=1000&ea&initialScreen=2&homeScreen=false',
  initialScreen2: 'brand=phet&fuzz&memoryLimit=1000&ea&initialScreen=2',

  // Purposefully use incorrect syntax to make sure it is caught correctly without crashing
  screensVerbose: 'brand=phet&fuzz&memoryLimit=1000&ea&screens=Screen1,Screen2',
  screensOther: 'brand=phet&fuzz&memoryLimit=1000&ea&screens=1.1,Screen2'
};
Object.keys( commonQueryParameters ).forEach( name => {
  const queryString = commonQueryParameters[ name ];

  // randomly picked multi-screen sim
  tests.push( {
    test: [ 'acid-base-solutions', 'fuzz', 'unbuilt', 'query-parameters', name ],
    type: 'sim-test',
    url: 'acid-base-solutions/acid-base-solutions_en.html',
    queryParameters: queryString
  } );
} );

//----------------------------------------------------------------------------------------------------------------------
// Sim-specific query parameter tests
//----------------------------------------------------------------------------------------------------------------------

// beers-law-lab
tests.push( {
  test: [ 'beers-law-lab', 'fuzz', 'unbuilt', 'query-parameters' ],
  type: 'sim-test',
  url: 'beers-law-lab/beers-law-lab_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&showSoluteAmount&concentrationMeterUnits=percent&beakerUnits=milliliters'
} );

// energy forms and changes

// four blocks and one burner
tests.push( {
  test: [ 'energy-forms-and-changes', 'fuzz', 'unbuilt', 'query-parameters' ],
  type: 'sim-test',
  url: 'energy-forms-and-changes/energy-forms-and-changes_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&screens=1&elements=iron,brick,iron,brick&burners=1'
} );

// two beakers and 2 burners
tests.push( {
  test: [ 'energy-forms-and-changes', 'fuzz', 'unbuilt', 'query-parameters-2' ],
  type: 'sim-test',
  url: 'energy-forms-and-changes/energy-forms-and-changes_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&screens=1&&elements=oliveOil,water&burners=2'
} );

// gas-properties
tests.push( {
  test: [ 'gas-properties', 'fuzz', 'unbuilt', 'query-parameters' ],
  type: 'sim-test',
  url: 'gas-properties/gas-properties_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&pressureNoise=false'
} );

// natural-selection

tests.push( {
  test: [ 'natural-selection', 'fuzz', 'unbuilt', 'query-parameters' ],
  type: 'sim-test',
  url: 'natural-selection/natural-selection_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&allelesVisible=false&introMutations=F&introPopulation=10Ff&labMutations=FeT&labPopulation=2FFeett,2ffEEtt,2ffeeTT'
} );

// To have one test where the generation clock is running faster, and more things are liable to happen
tests.push( {
  test: [ 'natural-selection', 'fuzz', 'unbuilt', 'secondsPerGeneration' ],
  type: 'sim-test',
  url: 'natural-selection/natural-selection_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&secondsPerGeneration=1'
} );

// ph-scale
tests.push( {
  test: [ 'ph-scale', 'autofill-fuzz', 'unbuilt', 'query-parameters' ],
  type: 'sim-test',
  url: 'ph-scale/ph-scale_en.html',
  queryParameters: 'brand=phet&ea&fuzz&memoryLimit=1000&autoFill=false'
} );

console.log( JSON.stringify( tests, null, 2 ) );
