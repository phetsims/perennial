// Copyright 2023-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import * as persistentQueue from './persistentQueue.js';
import { Request, Response } from 'express';

export default function getStatus( req: Request, res: Response ): void {
  const buildStatus = persistentQueue.getQueue();
  res.render( 'getStatus', {
    builds: buildStatus.queue,
    currentTask: buildStatus.currentTask,
    currentTime: new Date().toString()
  } );
}
