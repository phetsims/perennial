// Copyright 2002-2026, University of Colorado Boulder

/**
 * PhET build and deploy server. The server is designed to run on the same host as the production site (phet-server.int.colorado.edu).
 * This file initializes the app and the main process queue.
 *
 * TODO: move to top-level build-server directory https://github.com/phetsims/totality/issues/140
 *
 * @author Aaron Davis
 * @author Matt Pennington
 */

import constants from './constants.js';
import childProcess from 'child_process';
// eslint-disable-next-line phet/default-import-match-filename
import winston from './log.js';
import { logRequest } from './logRequest.js';
import { sendEmail } from './sendEmail.js';
import { taskWorker } from './taskWorker.js';
import async from 'async';
import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import _ from 'lodash';
import parseArgs from 'minimist';
import * as persistentQueue from './persistentQueue.js';
import getStatus from './getStatus.js';
import { BuildServerRequest, BuildServerSimTask, BuildServerTask } from '../browser-and-node/PerennialTypes.js';

// set this process up with the appropriate permissions, value is in octal
process.umask( 0o0002 );

/**
 * Handle command line input
 * First 2 args provide info about executables, ignore
 */
const parsedCommandLineOptions = parseArgs( process.argv.slice( 2 ), {
  boolean: true
} );

const defaultOptions = {
  verbose: constants.BUILD_SERVER_CONFIG.verbose, // can be overridden by a flag on the command line

  // options for supporting help
  help: false,
  h: false
};

for ( const key in parsedCommandLineOptions ) {
  if ( key !== '_' && parsedCommandLineOptions.hasOwnProperty( key ) && !defaultOptions.hasOwnProperty( key ) ) {
    console.error( `Unrecognized option: ${key}` );
    console.error( 'try --help for usage information.' );
    process.exit( 1 );
  }
}

// If help flag, print help and usage info
if ( parsedCommandLineOptions.hasOwnProperty( 'help' ) || parsedCommandLineOptions.hasOwnProperty( 'h' ) ) {
  console.log( 'Usage:' );
  console.log( '  node --import tsx build-server.ts [options]' );
  console.log( '' );
  console.log( 'Options:' );
  console.log(
    '  --help (print usage and exit)\n' +
    '    type: bool  default: false\n' +
    '  --verbose (output grunt logs in addition to build-server)\n' +
    '    type: bool  default: false\n'
  );
  process.exit( 1 );
}

// Merge the default and supplied options.
const options = _.assignIn( defaultOptions, parsedCommandLineOptions );
const verbose = options.verbose;

const taskQueue = async.queue<BuildServerTask>( taskWorker, 1 ); // 1 is the max number of tasks that can run concurrently

const postQueueDeploy = ( req: Request, res: Response ): void => {
  logRequest( req, 'body' );

  const body: BuildServerRequest = req.body;

  const simTask: BuildServerSimTask = {
    type: 'sim',
    api: body[ constants.API_KEY ],
    simName: body[ constants.SIM_NAME_KEY ],
    versionString: body[ constants.VERSION_STRING_KEY ],
    legacyBranch: body[ constants.LEGACY_BRANCH_KEY ],
    locales: body[ constants.LOCALES_KEY ],
    totalitySHA: body[ constants.TOTALITY_SHA_KEY ],
    servers: body[ constants.SERVERS_KEY ],
    brands: body[ constants.BRANDS_KEY ]
  };

  if ( body[ constants.EMAIL_KEY ] ) {
    simTask.email = body[ constants.EMAIL_KEY ];
  }
  if ( body[ constants.USER_ID_KEY ] ) {
    simTask.userId = body[ constants.USER_ID_KEY ];
  }
  if ( body[ constants.DEPLOY_IMAGES_KEY ] ) {
    simTask.deployImages = body[ constants.DEPLOY_IMAGES_KEY ];
  }

  const authorizationKey = body[ constants.AUTHORIZATION_KEY ];

  queueDeploy( simTask, authorizationKey, req, res );
};

/**
 * Adds the request to the processing queue and handles email notifications about success or failures
 */
const queueDeploy = (
  simTask: BuildServerSimTask,
  authorizationKey: string,
  req: Request,
  res: Response
): void => {
  // Not doing full validation here, because other failures we'll want to propagate by email
  if ( authorizationKey && simTask.simName && simTask.versionString ) {
    const productionBrands = [ constants.PHET_BRAND, constants.PHET_IO_BRAND ];

    if ( authorizationKey !== constants.BUILD_SERVER_CONFIG.buildServerAuthorizationCode ) {
      const err = 'wrong authorization code';
      winston.log( 'error', err );
      res.status( 401 );
      res.send( err );
    }
    else if ( simTask.servers.includes( constants.PRODUCTION_SERVER ) && simTask.brands.some( brand => !productionBrands.includes( brand ) ) ) {
      const err = 'Cannot complete production deploys for brands outside of phet and phet-io';
      winston.log( 'error', err );
      res.status( 400 );
      res.send( err );
    }
    else {
      winston.log( 'info', `queuing build for ${simTask.simName} ${simTask.versionString}` );
      persistentQueue.addTask( simTask );
      taskQueue.push( simTask, buildCallback( simTask ) );

      res.status( 202 );
      res.send( 'build process initiated, check logs for details' );
    }
  }
  else {
    const errorString = 'missing one or more required query parameters: dependencies, simName, version, authorizationCode';
    winston.log( 'error', errorString );
    res.status( 400 );
    res.send( errorString );
  }
};

const buildCallback = ( task: BuildServerTask ) => {
  return async ( err?: Error | string | null ): Promise<void> => {
    if ( task.type !== 'deployImages' ) {
      const simInfoString = `Sim = ${task.simName
      } Version = ${task.versionString
      } Brands = ${task.brands
      } Locales = ${task.locales}`;

      if ( err ) {
        const errorMessage = `Build failure: ${err}. ${simInfoString} totality sha = ${JSON.stringify( task.totalitySHA )}`;
        winston.log( 'error', errorMessage );
        await sendEmail( 'BUILD ERROR', errorMessage, task.email );
      }
      else {
        winston.log( 'info', `build for ${task.simName} finished successfully` );
        persistentQueue.finishTask();
        await sendEmail( 'Build Succeeded', simInfoString, task.email, true );
      }
    }
  };
};

const postQueueImageDeploy = ( req: Request, res: Response ): void => {
  logRequest( req, 'body' );

  const authorizationKey = req.body[ constants.AUTHORIZATION_KEY ];
  if ( authorizationKey !== constants.BUILD_SERVER_CONFIG.buildServerAuthorizationCode ) {
    const err = 'wrong authorization code';
    winston.log( 'error', err );
    res.status( 401 );
    res.send( err );
    return;
  }

  const email = req.body[ constants.EMAIL_KEY ] || null;
  const simulation = req.body[ constants.SIM_NAME_KEY ] || null;
  const version = req.body[ constants.VERSION_KEY ] || null;
  const emailBodyText = 'Not implemented';

  taskQueue.push(
    {
      type: 'deployImages',
      simName: simulation,
      versionString: version
    },
    async ( err?: Error | string | null ) => {
      if ( err ) {
        const errorMessage = `Image deploy failure: ${err}`;
        winston.log( 'error', errorMessage );
        await sendEmail( 'IMAGE DEPLOY ERROR', errorMessage, email );
      }
      else {
        winston.log( 'info', 'Image deploy finished successfully' );
        await sendEmail( 'Image deploy succeeded', emailBodyText, email, true );
      }
    } );

  res.status( 202 );
  res.send( 'build process initiated, check logs for details' );
};

// Create the ExpressJS app
const app = express();

// to support JSON-encoded bodies
app.use( bodyParser.json() );

// add the route to build and deploy
app.post( '/deploy-html-simulation', postQueueDeploy );
app.post( '/deploy-images', postQueueImageDeploy );

app.set( 'views', './views' );
app.set( 'view engine', 'pug' );
app.get( '/deploy-status', getStatus );

// start the server
app.listen( constants.LISTEN_PORT, () => {
  winston.log( 'info', `Listening on port ${constants.LISTEN_PORT}` );
  winston.log( 'info', `Verbose mode: ${verbose}` );

  // log the SHA of perennial - this may make it easier to duplicate and track down problems
  try {
    const sha = childProcess.execSync( 'git rev-parse HEAD' );
    winston.info( `current SHA: ${sha.toString()}` );
  }
  catch( err ) {
    winston.warn( `unable to get SHA from git, err: ${err}` );
  }

  // Recreate queue
  try {
    const queue = persistentQueue.getQueue().queue;
    for ( const task of queue ) {
      console.log( 'Resuming task from persistent queue: ', task );
      taskQueue.push( task, buildCallback( task ) );
    }
  }
  catch( e ) {
    console.error( 'could not resume queue' );
  }
} );
