// Copyright 2023, University of Colorado Boulder

/**
 * Add content to file.
 *
 * @author Liam Mulhall <liammulh@gmail.com>
 */

import { writeFileSync } from 'node:fs';

/**
 * Append the given content to the file.
 *
 * @param {String} pathToFile - path to the file you want to append to
 * @param {String} content - content you want to add to the file
 */
const appendToFile = ( pathToFile, content ) => {
  writeFileSync( pathToFile, content, { encoding: 'utf-8', flag: 'a' } );
};

export default appendToFile;