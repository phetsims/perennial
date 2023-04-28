// Copyright 2023, University of Colorado Boulder

const fs = require( 'fs' );
const _ = require( 'lodash' );

const getQueue = () => {
  try {
    const queue = JSON.parse( fs.readFileSync( '.build-server-queue' ).toString() );
    if ( !Array.isArray( queue ) ) {
      console.error( 'Queue is not an array, found this instead', JSON.stringify( queue ) );
      console.error( 'Returning a blank queue' );
      return [];
    }
    else {
      return queue;
    }
  }
  catch( e ) {
    console.error( 'Queue not retrievable, returning blank queue', e );
    return [];
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
  branch: task.branch
} );

const addTask = task => {
  const queue = getQueue();
  queue.push( formatTask( task ) );
  saveQueue( queue );
};

const removeTask = task => {
  const queue = getQueue();
  const taskIndex = queue.findIndex( t => _.isEqual( t, formatTask( task ) ) );
  queue.splice( taskIndex, 1 );
  saveQueue( queue );
};

module.exports = {
  addTask: addTask,
  removeTask: removeTask,
  getQueue: getQueue
};