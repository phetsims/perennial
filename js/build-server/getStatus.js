// Copyright 2023, University of Colorado Boulder

const persistentQueue = require( './persistentQueue' );

module.exports = function getStatus( req, res ) {
  const buildStatus = persistentQueue.getQueue();
  res.render( 'getStatus', {
    builds: buildStatus.queue,
    currentTask: buildStatus.currentTask,
    currentTime: new Date().toString()
  } );
};
