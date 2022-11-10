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

const path = require( 'path' );
const fs = require( 'fs' );
const assert = require( 'assert' );

const logDir = path.resolve( __dirname, '../../logs' );
try {
  fs.mkdirSync( logDir );
}
catch( e ) {
  // already exists
}

// Log to perennial-alias if running a perennial-alias task, or perennial if running a perennial task.
const logPath = path.resolve( logDir, 'phet-timing-log.txt' );

// WriteStream for appending data.  Created lazily.  Closed on each top-level pop so we can guarantee flush.
let stream = null;

// Depth of nesting.  -1 means not yet started.  0 means top-level.
let depth = -1;

const indent = depth => '  '.repeat( depth );

const push = ( taskName, options = null ) => {
  assert( !taskName.includes( ':' ), 'task name cannot include :, it was ' + taskName );

  depth++;

  if ( stream === null ) {
    stream = fs.createWriteStream( logPath, { flags: 'a' } );
  }
  if ( depth === 0 ) {
    const time = new Date().toLocaleString( 'en-US', { timeZone: 'America/Denver' } );
    stream.write( `<!-- ${time} -->\n` );
  }
  stream.write( `${indent( options && options.hasOwnProperty( 'depth' ) ? options.depth : depth )}<${taskName}>\n` );

  const startTime = Date.now();
  return startTime;
};

const pop = ( taskName, startTime, options = null ) => {
  const endTime = Date.now();

  stream.write( `${indent( options && options.hasOwnProperty( 'depth' ) ? options.depth : depth )}</${taskName}> <!-- ${endTime - startTime}ms -->\n` );

  if ( depth === 0 ) {
    stream.write( '\n', () => {

      // Guaranteed flushing the buffer.  Without this, we end up with partial/truncated output.
      stream.close( () => {

        // Flag the stream as needing to be recreated next time we want to write to the buffer
        stream = null;
      } );
    } );
  }

  depth--;
};

const phetTimingLog = {

  /**
   * Invoke the task and return the return value of the task.
   * @param {string} taskName
   * @param {()=>T} task
   * @returns {T}
   */
  start( taskName, task ) {
    const startTime = push( taskName );
    const result = task();
    pop( taskName, startTime );
    return result;
  },

  /**
   * Invoke the task and return the return value of the task.
   * @param {string} taskName
   * @param {()=>Promise<T>} task
   * @returns {Promise<T>}
   */
  async startAsync( taskName, task, options ) {
    const startTime = push( taskName, options );
    const result = await task();
    pop( taskName, startTime, options );
    return result;
  },

  /**
   * Flush the write stream before exiting node.
   * @param {()=>void} [callback]
   */
  close( callback = () => {} ) {
    stream.close( callback );
  }
};

module.exports = phetTimingLog;