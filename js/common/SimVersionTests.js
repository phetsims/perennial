// Copyright 2023, University of Colorado Boulder

/**
 * Node qunit tests for SimVersion
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const SimVersion = require( '../browser-and-node/SimVersion' ).default;
const qunit = require( 'qunit' );

qunit.module( 'SimVersion' );


qunit.test( 'SimVersion Basics', async assert => {

  const testVersion = ( simVersion, major, minor, maintenance, message ) => {

    assert.ok( simVersion.major === major, `major: ${message}` );
    assert.ok( simVersion.minor === minor, `minor: ${message}` );
    assert.ok( simVersion.maintenance === maintenance, `maintenance: ${message}` );
  };

  const simVersion = new SimVersion( 1, 2, 0 );
  testVersion( simVersion, 1, 2, 0, 'basic constructor' );

  let versions = [
    new SimVersion( 1, 2, 0 ),
    new SimVersion( 1, 4, 0 ),
    new SimVersion( 1, 3, 0 )
  ];

  versions.sort( ( a, b ) => a.compareNumber( b ) );

  testVersion( versions[ 0 ], 1, 2, 0, 'sorted first' );
  testVersion( versions[ 1 ], 1, 3, 0, 'sorted second' );
  testVersion( versions[ 2 ], 1, 4, 0, 'sorted third' );

  versions = [
    new SimVersion( 2, 2, 2 ),
    new SimVersion( 1, 5, 6 ),
    new SimVersion( 3, 0, 0 )
  ];

  versions.sort( SimVersion.comparator );
  testVersion( versions[ 0 ], 1, 5, 6, 'another sorted first' );
  testVersion( versions[ 1 ], 2, 2, 2, 'another sorted second' );
  testVersion( versions[ 2 ], 3, 0, 0, 'another sorted third' );

  assert.throws( () => {
    return SimVersion( '1fdsaf', '2fdsaf', '3fdsa' );
  }, 'letters as version, boo' );

  assert.throws( () => {
    return SimVersion( 'fdsaf1fdsaf', 'fdsaf2fdsaf', 'fdsa3fdsa' );
  }, 'letters as version, boo two' );

  assert.throws( () => {
    return SimVersion( true, false, true );
  }, 'letters as version, boo' );

  const mySimVersion = new SimVersion( '1', '2', '3', {
    testType: 'rc',
    testNumber: '1'
  } );
  testVersion( mySimVersion, 1, 2, 3, 'basic constructor' );
  assert.ok( mySimVersion.testNumber === 1, 'testNumber number cast check' );
  assert.ok( mySimVersion.toString() === '1.2.3-rc.1', 'as string' );

} );

qunit.test( 'SimVersion Parsing', async assert => {

  assert.throws( () => {
    return SimVersion.parse( '3.0' );
  }, 'only major.minor' );

  assert.throws( () => {
    return SimVersion.parse( 'gfjkdslgjf' );
  }, 'only major.minor' );
} );

qunit.test( 'SimVersion Sorting', async assert => {

  const versions = [
    '2.4.1',
    '0.3.3',
    '2.0.0',
    '2.3.1-dev.1',
    '2.4.0',
    '2.3.3-rc.2',
    '2.3.35',
    '2.3.36'
  ];
  versions.map( version => SimVersion.parse( version ) );

  const sorted = versions.map( version => SimVersion.parse( version ) ).sort( SimVersion.comparator );
  assert.equal( sorted[ 0 ].toString(), '0.3.3', 'smallest' );
  assert.equal( sorted[ sorted.length - 1 ].toString(), '2.4.1', 'largest' );
} );