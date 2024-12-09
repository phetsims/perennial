// Copyright 2022, University of Colorado Boulder

/**
 * Outputs timing information for nested structured tasks, so they can be inspected to understand what is
 * taking so long. This is optimized for human-readability. Use an XML-like syntax for structuring, though the overall
 * format is not xml since there are multiple root elements.  Output timing information in a comment after a closing tag.
 * Sessions are delimited by a blank line. Un-truncated sessions are XML parseable, but the timing data is in the comments
 * so naive XML parsing won't help in analysis.
 *
 * - Data is streamed as it is generated, and hence may be incomplete if a process is interrupted.
 * - This is coded in perennial so it can be used in chipper tasks (via perennial-alias) and also for perennial tasks as needed.
 * - Assumes single-threaded access to the interface
 *
 * You can watch the results stream out live, and get a good sense of where the time is being spent by running
 * tail -f /path/to/perennial-alias/logs/phet-timing-log.txt
 *
 * This task is to help identify bottlenecks and cross-platform differences. It is not intended to account for
 * every millisecond in self-time.
 *
 * The log file is dedicated to timing information and structuring of tasks, and we should not add supplemental metadata
 * such as messages or results from tasks.
 *
 * Assumes that task structuring is all done in one frame--not possible to start an event in one animation frame
 * and end it in another.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs, { WriteStream } from 'fs';
import _ from 'lodash';
import path from 'path';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';

const logDir = path.resolve( __dirname, '../../logs' );
try {
  fs.mkdirSync( logDir );
}
catch( e ) {
  // already exists
}

type PhetTimingLogOptions<T = IntentionalPerennialAny> = {
  depth?: number;
  timingCallback?: ( time: number, result: T ) => void;
};

// Log to perennial-alias if running a perennial-alias task, or perennial if running a perennial task.
const logPath = path.resolve( logDir, 'phet-timing-log.txt' );

// WriteStream for appending data.  Created lazily.  Closed on each top-level pop so we can guarantee flush.
let stream: WriteStream | null = null;

// Depth of nesting.  -1 means not yet started.  0 means top-level.
let depth = -1;

const indent = ( depth = 0 ) => '  '.repeat( depth );

const getDate = () => new Date().toLocaleString( 'en-US', { timeZone: 'America/Denver' } );

const push = ( taskName: string, options?: PhetTimingLogOptions ): number => {
  assert( !taskName.includes( ':' ), 'task name cannot include :, it was ' + taskName );

  depth++;

  if ( stream === null ) {
    stream = fs.createWriteStream( logPath, { flags: 'a' } );
  }

  // only write a start tag for depth of 0, nested content is just printed upon completion
  if ( depth === 0 ) {

    const indentSpace = indent( options && options.hasOwnProperty( 'depth' ) ? options.depth : depth );

    // Add date attribute to all that are in depth 0
    stream.write( `${indentSpace}<${taskName} date="${getDate()}">\n` );
  }

  return Date.now();
};

const pop = ( taskName: string, startTime: number, options?: PhetTimingLogOptions ): number => {
  const endTime = Date.now();

  const isTopLevel = depth === 0;

  const indentSpacing = indent( options && options.hasOwnProperty( 'depth' ) ? options.depth : depth );
  const startSlash = isTopLevel ? '/' : ''; // end tag for depth 0
  const endSlash = isTopLevel ? '' : '/'; // tag is a solo tag when depth is not 0
  assert( stream );
  const totalTime = endTime - startTime;
  stream.write( `${indentSpacing}<${startSlash}${taskName} time="${totalTime}ms"${endSlash}>\n` );

  if ( isTopLevel ) {
    stream.write( '\n', () => {
      assert( stream );

      // Guaranteed flushing the buffer.  Without this, we end up with partial/truncated output.
      stream.close( () => {

        // Flag the stream as needing to be recreated next time we want to write to the buffer
        stream = null;
      } );
    } );
  }

  depth--;

  return totalTime;
};

const phetTimingLog = {

  /**
   * Invoke the task and return the return value of the task.
   */
  async startAsync<T>( taskName: string, task: () => Promise<T>, options?: PhetTimingLogOptions<T> ): Promise<T> {
    const startTime = push( taskName, options );
    const result = await task();
    const time = pop( taskName, startTime, options );
    options?.timingCallback && options.timingCallback( time, result );
    return result;
  },

  /**
   * Flush the write stream before exiting node.
   */
  close( callback: () => void = _.noop ): void {
    assert( stream );
    stream.close( callback );
  }
};

export default phetTimingLog;