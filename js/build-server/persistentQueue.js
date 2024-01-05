// Copyright 2023, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const fs = require( 'fs' );
const _ = require( 'lodash' );

const createNewQueue = () => ( { queue: [], currentTask: null } );

const getQueue = () => {
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

const saveQueue = queue => {
  fs.writeFileSync( '.build-server-queue', JSON.stringify( queue ) );
};

const formatTask = task => ( {
  api: task.api,
  repos: task.repos,
  simName: task.simName,
  version: task.version,
  locales: task.locales,
  servers: task.servers,
  brands: task.brands,
  email: task.email,
  userId: task.userId,
  branch: task.branch,
  enqueueTime: task.enqueueTime
} );

const addTask = task => {
  const buildStatus = getQueue();
  task.enqueueTime = new Date().toString();
  buildStatus.queue.push( formatTask( task ) );
  saveQueue( buildStatus );
};

const startTask = task => {
  const buildStatus = getQueue();
  const taskIndex = buildStatus.queue.findIndex( t => _.isEqual( t, formatTask( task ) ) );
  buildStatus.queue.splice( taskIndex, 1 );
  buildStatus.currentTask = task;
  buildStatus.currentTask.startTime = new Date().toString();
  saveQueue( buildStatus );
};

const finishTask = () => {
  const buildStatus = getQueue();
  buildStatus.currentTask = null;
  saveQueue( buildStatus );
};

module.exports = {
  addTask: addTask,
  startTask: startTask,
  finishTask: finishTask,
  getQueue: getQueue
};