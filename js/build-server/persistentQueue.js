// Copyright 2023, University of Colorado Boulder

const fs = require( 'fs' );

const getQueue = () => {
  try {
    const queue = JSON.parse( fs.readFileSync( '.build-server-queue' ).toString() );
    if ( !Array.isArray( queue ) ) {
      console.error( 'Queue not retrievable, returning blank queue', e );
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
  fs.writeFileSync( JSON.stringify( queue ) );
};

const addTask = task => {
  const queue = getQueue();
  queue.push( task );
  saveQueue( queue );
};

const removeTask = task => {
  const queue = getQueue();
  const taskIndex = queue.findIndex( t => _.equals( t, task ) );
  queue.splice( taskIndex, 1 );
  saveQueue( queue );
};

module.exports = {
  addTask: addTask,
  removeTask: removeTask,
  getQueue: getQueue,
};