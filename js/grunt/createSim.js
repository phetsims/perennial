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

const _ = require( 'lodash' );
const assert = require( 'assert' );
const execute = require( '../common/execute' );
const grunt = require( 'grunt' );
const gruntCommand = require( '../common/gruntCommand' );
const npmUpdate = require( '../common/npmUpdate' );
const fs = require( 'fs' );

/**
 * @param {string} repo
 * @param {string} author
 * @param {Object} [options]
 */
module.exports = async function( repo, author, options ) {
  const {
    title = toTitle( repo ),
    clean = false
  } = options || {};

  assert( typeof repo === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( repo ), 'repo name should be composed of lower-case characters, optionally with dashes used as separators' );
  assert( typeof author === 'string' );
  assert( typeof title === 'string' );
  assert( typeof clean === 'boolean' );

  /**
   * Coerces a repository name to a sim title, eg, 'simula-rasa' -> 'Simula Rasa'
   * @param {string} simName - the input string like 'build-an-atom'
   * @returns {string}
   */
  function toTitle( simName ) {
    const tmpString = simName.replace( /-(.)/g, ( match, group1 ) => {
      return ` ${group1.toUpperCase()}`;
    } );
    return tmpString.substring( 0, 1 ).toUpperCase() + tmpString.substring( 1 );
  }

  grunt.log.writeln( `Greetings ${author}!` );
  grunt.log.writeln( `creating sim with repository name ${repo}` );

  // initialize the directory
  const destinationPath = `../${repo}`;
  if ( grunt.file.exists( destinationPath ) ) {
    if ( clean ) {
      grunt.log.writeln( `Cleaning ${destinationPath}` );
      grunt.file.delete( destinationPath, { force: true } ); // delete won't operate outside of current working dir unless forced
    }
    else {
      grunt.log.writeln( `WARNING:${destinationPath} already exists, overwriting` );
    }
  }
  grunt.file.mkdir( destinationPath );

  // Create variations of the repository name
  const configPath = repo.toUpperCase().replace( /-/g, '_' ); // eg, 'simula-rasa' -> 'SIMULA_RASA'
  const lowerCamelCase = _.camelCase( repo ); // eg, 'simula-rasa' -> 'simulaRasa'
  const upperCamelCase = lowerCamelCase.substring( 0, 1 ).toUpperCase() + lowerCamelCase.substring( 1 ); // eg, 'simula-rasa' -> 'SimulaRasa'

  const yearToday = grunt.template.today( 'yyyy' );

  // Iterate over the file system and copy files, changing filenames and contents as we go.
  grunt.file.recurse( '../simula-rasa', ( abspath, rootdir, subdir, filename ) => {

    // skip these files
    if ( abspath.indexOf( '../simula-rasa/README.md' ) === 0 ||
         abspath.indexOf( '../simula-rasa/node_modules/' ) === 0 ||
         abspath.indexOf( '../simula-rasa/.git/' ) === 0 ||
         abspath.indexOf( '../simula-rasa/build/' ) === 0 ) {

      // do nothing
    }
    else {
      let contents = grunt.file.read( abspath );

      // Replace variations of the repository name
      contents = contents.replace( /simula-rasa/g, repo );
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
      contentsPath = contentsPath.replace( /simula-rasa/, repo );
      contentsPath = contentsPath.replace( /simulaRasa/, lowerCamelCase );
      contentsPath = contentsPath.replace( /SimulaRasa/, upperCamelCase );

      // Write the file
      grunt.file.write( contentsPath, contents );
      grunt.log.writeln( 'wrote', contentsPath );
    }
  } );

  // Delete readmeCreatedManually from template, see https://github.com/phetsims/perennial/issues/199
  const packagePath = `${destinationPath}/package.json`;
  const simPackageJSON = grunt.file.readJSON( packagePath );
  if ( simPackageJSON.phet && simPackageJSON.phet.hasOwnProperty( 'readmeCreatedManually' ) ) {
    delete simPackageJSON.phet.readmeCreatedManually;
  }
  fs.writeFileSync( packagePath, JSON.stringify( simPackageJSON, null, 2 ) );

  await npmUpdate( repo );
  await execute( gruntCommand, [ 'unpublished-README' ], `../${repo}` );
};
