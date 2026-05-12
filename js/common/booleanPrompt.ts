// Copyright 2017-2026, University of Colorado Boulder

/**
 * Gives a yes-or-no prompt that the user should respond to.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { prompt } from './prompt.js';

/**
 * Gives a yes-or-no prompt that the user should respond to.
 *
 * @param question - The string to be shown to the user
 * @param noninteractive - If true, skips the prompt
 */
export const booleanPrompt = async (
  question: string,
  noninteractive: boolean
): Promise<boolean> => {
  if ( noninteractive ) {
    return true;
  }

  const answer = await prompt( `${question} [y/N]?` );

  return !( /[Nn]/.test( answer ) ) && /[Yy]/.test( answer );
};