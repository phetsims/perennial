// Copyright 2014-2015, University of Colorado Boulder

/**
 * This grunt task creates a simulation based on the simula-rasa template.
 * This task must be run from perennial directory.
 *
 * Example usage:
 * grunt create-sim --repo=cannon-blaster --author="Sam Reid (PhET Interactive Simulations)"
 *
 * This task will attempt to coerce a sim title from the repository name. For example,
 * 'cannon-blaster' becomes 'Cannon Blaster'.  If this is not suitable, then use --title
 * to specify a title.  For example:
 * grunt create-sim --repo=fractions-basics --title="Fractions: Basics" --author="Sam Reid (PhET Interactive Simulations)"
 *
 * For development and debugging, add --clean=true to delete the repository directory.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Malley (PixelZoom, Inc.)
 */

import assert from 'assert';
import { PackageJSON, Sim } from '../browser-and-node/PerennialTypes.js';
import { assertIsValidDependencyName } from './assertIsValidDependencyName.js';
import fs from 'fs';
import os from 'os';
import _ from 'lodash';
import execute from './execute.js';
import { gruntCommand } from './gruntCommand.js';

export type CreateSimOptions = {
  title?: string;
  clean?: boolean;
};

/**
 * Coerces a repository name to a sim title, eg, 'simula-rasa' -> 'Simula Rasa'
 * @param simName - the input string like 'build-an-atom'
 */
const toTitle = ( simName: Sim ): string => {
  const tmpString = simName.replace( /-(.)/g, ( match, group1 ) => {
    return ` ${group1.toUpperCase()}`;
  } );
  return tmpString.substring( 0, 1 ).toUpperCase() + tmpString.substring( 1 );
};

export const createSim = async (
  sim: Sim,
  author: string,
  options?: CreateSimOptions

): Promise<void> => {

  const {
    title = toTitle( sim ),
    clean = false
  } = options || {};

  assertIsValidDependencyName( sim );

  assert( /^[a-z]+(-[a-z]+)*$/u.test( sim ), 'sim name should be composed of lower-case characters, optionally with dashes used as separators' );

  console.log( `Greetings ${author}!` );
  console.log( `creating sim with name ${sim}` );

  // initialize the directory
  const destinationPath = `../${sim}`;
  if ( fs.existsSync( destinationPath ) ) {
    if ( clean ) {
      console.log( `Cleaning ${destinationPath}` );

      await fs.promises.rm( destinationPath, { recursive: true, force: true } );
    }
    else {
      console.log( `WARNING:${destinationPath} already exists, overwriting` );
    }
  }
  await fs.promises.mkdir( destinationPath, { recursive: true } );

  // Create variations of the repository name
  const configPath = sim.toUpperCase().replace( /-/g, '_' ); // eg, 'simula-rasa' -> 'SIMULA_RASA'
  const lowerCamelCase = _.camelCase( sim ); // eg, 'simula-rasa' -> 'simulaRasa'
  const upperCamelCase = lowerCamelCase.substring( 0, 1 ).toUpperCase() + lowerCamelCase.substring( 1 ); // eg, 'simula-rasa' -> 'SimulaRasa'

  const yearToday = new Date().getFullYear();

  // Iterate over the file system and copy files, changing filenames and contents as we go.
  const simulaRasaPath = '../simula-rasa';
  const recurseSimulaRasa = ( directory: string, subdir: string | null ): void => {
    for ( const entry of fs.readdirSync( directory, { withFileTypes: true } ) ) {
      const abspath = `${directory}/${entry.name}`;

      // skip these files
      if ( abspath.startsWith( `${simulaRasaPath}/README.md` ) ||
           abspath.startsWith( `${simulaRasaPath}/node_modules/` ) ||
           abspath.startsWith( `${simulaRasaPath}/.git/` ) ||
           abspath.startsWith( `${simulaRasaPath}/build/` ) ) {

        // do nothing
      }
      else if ( entry.isDirectory() ) {
        recurseSimulaRasa( abspath, subdir ? `${subdir}/${entry.name}` : entry.name );
      }
      else if ( entry.isFile() ) {
        const filename = entry.name;
        let contents = fs.readFileSync( abspath, 'utf-8' );

        // Replace variations of the repository name
        contents = contents.replace( /simula-rasa/g, sim );
        contents = contents.replace( /SIMULA_RASA/g, configPath );
        contents = contents.replace( /simulaRasa/g, lowerCamelCase );
        contents = contents.replace( /SimulaRasa/g, upperCamelCase );

        // Replace the title
        contents = contents.replace( /{{TITLE}}/g, title );

        // Replace author
        contents = contents.replace( /{{AUTHOR}}/g, author );

        // Fix copyright comments
        contents = contents.replace( /\/\/ Copyright \d\d\d\d.*/g, `// Copyright ${yearToday}, University of Colorado Boulder` );

        // Replace names in the path where the contents will be written
        let contentsPath = subdir ? ( `${destinationPath}/${subdir}/${filename}` ) : ( `${destinationPath}/${filename}` );
        contentsPath = contentsPath.replace( /simula-rasa/, sim );
        contentsPath = contentsPath.replace( /simulaRasa/, lowerCamelCase );
        contentsPath = contentsPath.replace( /SimulaRasa/, upperCamelCase );

        // Write the file
        fs.mkdirSync( contentsPath.substring( 0, contentsPath.lastIndexOf( '/' ) ), { recursive: true } );
        fs.writeFileSync( contentsPath, contents );
        console.log( 'wrote', contentsPath );
      }
    }
  };
  recurseSimulaRasa( simulaRasaPath, null );

  // Delete readmeCreatedManually from template, see https://github.com/phetsims/perennial/issues/199
  const packagePath = `${destinationPath}/package.json`;
  const simPackageJSON: PackageJSON = JSON.parse( fs.readFileSync( packagePath, 'utf8' ) );
  if ( simPackageJSON.phet && simPackageJSON.phet.hasOwnProperty( 'readmeCreatedManually' ) ) {
    delete simPackageJSON.phet.readmeCreatedManually;
  }
  fs.writeFileSync( packagePath, JSON.stringify( simPackageJSON, null, 2 ) + os.EOL );

  await execute( gruntCommand, [ 'unpublished-readme' ], `../${sim}` );
};
