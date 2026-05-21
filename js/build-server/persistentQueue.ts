// Copyright 2023-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import fs from 'fs';
import _ from 'lodash';
import { BuildServerTask } from '../browser-and-node/PerennialTypes.js';

type BuildServerQueue = {
  queue: BuildServerTask[];
  currentTask: BuildServerTask | null;
};

const createNewQueue = (): BuildServerQueue => ( { queue: [], currentTask: null } );

export const getQueue = (): BuildServerQueue => {
  try {
    const buildStatus = JSON.parse( fs.readFileSync( '.build-server-queue' ).toString() );

    if ( !Array.isArray( buildStatus.queue ) ) {
      console.error( 'Queue is not an array, found this instead', JSON.stringify( buildStatus.queue ) );
      console.error( 'Returning a blank queue' );
      return createNewQueue();
    }
    else {
      return buildStatus;
    }
  }
  catch( e ) {
    console.error( 'Queue not retrievable, returning blank queue', e );
    return createNewQueue();
  }
};

const saveQueue = ( queue: BuildServerQueue ): void => {
  fs.writeFileSync( '.build-server-queue', JSON.stringify( queue ) );
};

const formatTask = ( task: BuildServerTask ): BuildServerTask => ( task.type === 'deployImages' ? {
  type: task.type,
  simName: task.simName,
  versionString: task.versionString,
  enqueueTime: task.enqueueTime
} : {
  type: task.type,
  api: task.api,
  simName: task.simName,
  versionString: task.versionString,
  legacyBranch: task.legacyBranch,
  locales: task.locales,
  totalitySHA: task.totalitySHA,
  servers: task.servers,
  brands: task.brands,
  email: task.email,
  userId: task.userId,
  deployImages: task.deployImages,
  enqueueTime: task.enqueueTime
} ) as BuildServerTask; // NOTE: these aren't actually build server tasks!!! Keeping the same typing as before.

export const addTask = ( task: BuildServerTask ): void => {
  const buildStatus = getQueue();
  task.enqueueTime = new Date().toString();
  buildStatus.queue.push( formatTask( task ) );
  saveQueue( buildStatus );
};

export const startTask = ( task: BuildServerTask ): void => {
  const buildStatus = getQueue();
  const taskIndex = buildStatus.queue.findIndex( t => _.isEqual( t, formatTask( task ) ) );
  buildStatus.queue.splice( taskIndex, 1 );
  buildStatus.currentTask = task;
  buildStatus.currentTask.startTime = new Date().toString();
  saveQueue( buildStatus );
};

export const finishTask = (): void => {
  const buildStatus = getQueue();
  buildStatus.currentTask = null;
  saveQueue( buildStatus );
};
