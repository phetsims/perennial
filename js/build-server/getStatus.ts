// Copyright 2023-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import * as persistentQueue from './persistentQueue.js';

export default function getStatus( req: any, res: any ): void {
  const buildStatus = persistentQueue.getQueue();
  res.render( 'getStatus', {
    builds: buildStatus.queue,
    currentTask: buildStatus.currentTask,
    currentTime: new Date().toString()
  } );
}
