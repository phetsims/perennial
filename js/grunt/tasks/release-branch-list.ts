// Copyright 2024, University of Colorado Boulder

/**
 *   'Prints out a list of all release branches that would need maintenance patches\n' +
 *   '--repo : Only show branches for a specific repository\n' +
 *   '--order=<ORDER> : alphabetical|date',
 */
import assert from 'assert';
import _ from 'lodash';
import winston from 'winston';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import Maintenance from '../../common/Maintenance';
import getOption from './util/getOption';

( async () => {

  winston.default.transports.console.level = 'error';

  const repo = getOption( 'repo' );
  const order = getOption( 'order' ) || 'alphabetical';

  if ( repo ) {
    assertIsValidRepoName( repo );
  }

  assert( order === 'alphabetical' || order === 'date' );

  const branches = await Maintenance.getMaintenanceBranches( releaseBranch => !repo || releaseBranch.repo === repo,
    true, true );

  let structures = [];
  for ( const branch of branches ) {
    structures.push( {
      branch: branch,
      timestamp: await branch.getDivergingTimestamp()
    } );
  }

  if ( order === 'date' ) {
    structures = _.sortBy( structures, struct => struct.timestamp );
  }

  console.log( '\nRelease branches:\n{repo} {branch} {brand[,brand]+} {date}\n' );
  for ( const struct of structures ) {
    console.log( `${struct.branch.toString()} ${new Date( struct.timestamp ).toISOString().split( 'T' )[ 0 ]}` );
  }
} )();