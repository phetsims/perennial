// Copyright 2017, University of Colorado Boulder

/**
 * Unit tests, run with `npm run test-long` at the top-level of perennial.
 * NOTE! This task will change shas in many repos. Do not run in parallel and do not run outside of main.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */


const execute = require( '../common/execute' ).default;
const getBranches = require( '../common/getBranches' );
const gruntCommand = require( '../common/gruntCommand' );
const qunit = require( 'qunit' );

qunit.module( 'Perennial grunt tasks' );

async function getLatestBranch( repo ) {
  let currentMajor = 0;
  let currentMinor = 0;
  ( await getBranches( repo ) ).filter( branch => /^\d+\.\d+$/.test( branch ) ).forEach( branch => {
    const [ major, minor ] = branch.split( '.' ).map( str => Number( str ) );
    if ( major > currentMajor || ( major === currentMajor && minor > currentMinor ) ) {
      currentMajor = major;
      currentMinor = minor;
    }
  } );
  return {
    major: currentMajor,
    minor: currentMinor,
    toString() {
      return `${this.major}.${this.minor}`;
    }
  };
}

async function getLikelyNextBranch( repo, incrementMajor, incrementMinor ) {
  const latest = await getLatestBranch( repo );
  incrementMajor && latest.major++;
  incrementMinor && latest.minor++;
  return latest.toString();
}

qunit.test( 'NPM update', async assert => {
  assert.timeout( 120000 );
  await execute( gruntCommand, [ 'npm-update', '--repo=bumper' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Bumper one-off (random)', async assert => {
  assert.timeout( 3000000 );
  const branch = `oneoff${Math.random().toString( 36 ).substring( 2 )}`;

  // Create a random one-off branch
  await execute( gruntCommand, [ 'create-one-off', '--repo=bumper', `--branch=${branch}` ], '.' );

  await execute( gruntCommand, [ 'one-off', '--repo=bumper', `--branch=${branch}`, '--brands=phet,phet-io', '--noninteractive' ], '.' );

  await execute( gruntCommand, [ 'checkout-main', '--repo=bumper' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Bumper dev phet,phet-io', async assert => {
  assert.timeout( 600000 );
  await execute( gruntCommand, [ 'dev', '--repo=bumper', '--brands=phet,phet-io', '--noninteractive' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Bumper dev phet', async assert => {
  assert.timeout( 600000 );
  await execute( gruntCommand, [ 'dev', '--repo=bumper', '--brands=phet', '--noninteractive' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Bumper dev phet-io', async assert => {
  assert.timeout( 600000 );
  await execute( gruntCommand, [ 'dev', '--repo=bumper', '--brands=phet-io', '--noninteractive' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Major bump, RC/Production', async assert => {
  assert.timeout( 3000000 );
  const branch = await getLikelyNextBranch( 'bumper', false, true );

  // We can't create the branch interactively (for maintenance releases), so we do so here
  await execute( gruntCommand, [ 'create-release', '--repo=bumper', `--branch=${branch}`, '--brands=phet,phet-io' ], '.' );

  // should be rc.1 and maintenance:0 (phet,phet-io)
  await execute( gruntCommand, [ 'rc', '--repo=bumper', '--brands=phet,phet-io', `--branch=${branch}`, '--noninteractive' ], '.' );
  await execute( gruntCommand, [ 'production', '--repo=bumper', '--brands=phet,phet-io', `--branch=${branch}`, '--noninteractive' ], '.' );

  // same thing, but maintenance:1 (phet brand only)
  await execute( gruntCommand, [ 'rc', '--repo=bumper', '--brands=phet', `--branch=${branch}`, '--noninteractive' ], '.' );
  await execute( gruntCommand, [ 'production', '--repo=bumper', '--brands=phet', `--branch=${branch}`, '--noninteractive' ], '.' );

  // same thing, but maintenance:1 (phet-io brand only)
  await execute( gruntCommand, [ 'rc', '--repo=bumper', '--brands=phet-io', `--branch=${branch}`, '--noninteractive' ], '.' );
  await execute( gruntCommand, [ 'production', '--repo=bumper', '--brands=phet-io', `--branch=${branch}`, '--noninteractive' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Checkout target', async assert => {
  assert.timeout( 120000 );
  const latestBranch = await getLatestBranch( 'bumper' );
  await execute( gruntCommand, [ 'checkout-target', '--repo=bumper', `--target=${latestBranch}`, '--skipNpmUpdate' ], '.' );
  await execute( gruntCommand, [ 'checkout-main', '--repo=bumper', '--skipNpmUpdate' ], '.' );
  assert.expect( 0 );
} );