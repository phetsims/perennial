// Copyright 2023-2026, University of Colorado Boulder

/**
 * Loads and returns if chipperSupportsOutputJSGruntTasks
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { ChipperVersion } from './ChipperVersion.js';
import winston from 'winston';

export const chipperSupportsOutputJSGruntTasks = async (): Promise<boolean> => {
  const chipperVersion = await ChipperVersion.getFromRepository();
  const chipperSupportsOutputJSGruntTasks = chipperVersion.chipperSupportsOutputJSGruntTasks;
  winston.info( `chipperSupportsOutputJSGruntTasks: ${chipperSupportsOutputJSGruntTasks}` );
  return chipperSupportsOutputJSGruntTasks;
};