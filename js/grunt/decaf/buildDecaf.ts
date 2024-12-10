// Copyright 2017-2019, University of Colorado Boulder

/**
 * Deploys a decaf simulation after incrementing the test version number.  This file ported from dev.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import fs from 'fs';
import execute from '../../common/execute.js';
import SimVersion from '../../browser-and-node/SimVersion.js';
import getPreloads from './getPreloads.js';

const assert = require( 'assert' );
const copyFile = require( '../../common/copyFile.js' );
const gitRevParse = require( '../../common/gitRevParse.js' );
const loadJSON = require( '../../common/loadJSON.js' );
const writeJSON = require( '../../common/writeJSON.js' );
const path = require( 'path' );

// constants
const BUILD_LOCAL_FILENAME = `${process.env.HOME}/.phet/build-local.json`;

/**
 * Deploys a dev version after incrementing the test version number.
 */
export default async function( project: string ): Promise<void> {

  const buildLocalJSON = JSON.parse( fs.readFileSync( BUILD_LOCAL_FILENAME, { encoding: 'utf-8' } ) );
  const gitRoot = buildLocalJSON.gitRoot;
  const urlRoot = buildLocalJSON.urlRoot;
  const trunkPath = buildLocalJSON.decafTrunkPath;

  assert && assert( gitRoot !== undefined, 'buildLocal.gitRoot is undefined' );
  assert && assert( urlRoot !== undefined, 'buildLocal.urlRoot is undefined' );
  assert && assert( trunkPath !== undefined, 'buildLocal.decafTrunkPath is undefined' );

  // Command obtained from running in IntelliJ IDEA with the given .project.
  const cmd = [
    '-classpath',

    // Build classes with
    // ~/phet-svn-trunk-2020/build-tools$ chmod u+x ./contrib/apache-ant/bin/ant
    // ~/phet-svn-trunk-2020/build-tools$ ./build.sh
    // Other jars taken from /phet-svn-trunk-2020/build-tools/build-tools-build.properties
    `${trunkPath}/build-tools/ant_output/phetbuild/classes:${trunkPath}/build-tools/contrib/proguard/lib/proguard.jar:${trunkPath}/build-tools/contrib/commons-lang/commons-lang.jar:${trunkPath}/build-tools/contrib/jsch/jsch.jar:${trunkPath}/build-tools/contrib/scala/scala-compiler.jar:${trunkPath}/build-tools/contrib/scala/scala-library.jar:${trunkPath}/build-tools/contrib/apache-ant/lib/ant.jar:${trunkPath}/build-tools/contrib/apache-ant/lib/ant-launcher.jar:${trunkPath}/build-tools/contrib/yuicompressor/yuicompressor-2.4.4.jar:${trunkPath}/build-tools/contrib/jgit/org.eclipse.jgit-1.1.0.201109151100-r.jar:/Library/Java/JavaVirtualMachines/jdk1.7.0_80.jdk/Contents/Home/lib/tools.jar`,
    'edu.colorado.phet.buildtools.BuildScript',
    trunkPath,
    project
  ];

  const program = '/Library/Java/JavaVirtualMachines/jdk1.7.0_80.jdk/Contents/Home/bin/java';
  await execute( program, cmd, process.cwd() );

  const buildDir = `../decaf/projects/${project}/build/`;
  try {
    fs.mkdirSync( buildDir );
  }
  catch( e ) {
    console.log( 'perhaps the build directory exists' );
  }

  const allJar = `${gitRoot}decaf/projects/${project}/build/${project}_all.jar`;
  await copyFile( `${trunkPath}/simulations-java/simulations/${project}/deploy/${project}_all.jar`, allJar );
  console.log( 'copied' );

  const javaProperties = fs.readFileSync( `${trunkPath}/simulations-java/simulations/${project}/${project}-build.properties`, 'utf-8' );
  const lines: string[] = javaProperties.split( '\n' );
  const flavors = lines.filter( line => line.startsWith( 'project.flavor' ) ).map( line => line.split( '.' )[ 2 ] );
  let url = '';
  if ( flavors.length === 0 ) {
    url = `${urlRoot}/decaf/html?project=${project}`;
  }
  else {
    url = `${urlRoot}/decaf/html?project=${project}&simulation=${flavors[ 0 ]}`;
  }

  console.log( `awaiting preloads via puppeteer at url = ${url}` );
  const preloadResources = await getPreloads( url );
  console.log( `We have the preloads!\n${preloadResources}` );

  const packageFileRelative = `projects/${project}/package.json`;
  const packageFile = `../decaf/${packageFileRelative}`;
  const packageObject = await loadJSON( packageFile );
  const previousVersion = SimVersion.parse( packageObject.version );

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: 'dev',
    testNumber: previousVersion.testNumber! + 1
  } );
  packageObject.version = version.toString();
  await writeJSON( packageFile, packageObject );

  const versionString = version.toString();

  let html = fs.readFileSync( '../decaf/html/index.html', 'utf-8' );
  html = html.split( '{{PROJECT}}' ).join( project );
  html = html.split( '{{VERSION}}' ).join( versionString );
  html = html.split( '{{IS_BUILT}}' ).join( 'true' );
  html = html.split( '\'{{PRELOAD_RESOURCES}}\'' ).join( preloadResources );

  fs.writeFileSync( `${buildDir}/${project}.html`, html );

  const stringFiles = fs.readdirSync( `${trunkPath}/simulations-java/simulations/${project}/data/${project}/localization` );
  const locales = stringFiles.filter( stringFile => stringFile.includes( '_' ) ).map( file => file.substring( file.indexOf( '_' ) + 1, file.lastIndexOf( '.' ) ) );
  console.log( locales.join( '\n' ) );

  fs.writeFileSync( `${buildDir}/locales.txt`, locales.join( '\n' ) );
  fs.writeFileSync( `${buildDir}/simulations.txt`, flavors.join( '\n' ) );

  await copyFile( '../decaf/html/style.css', `${buildDir}/style.css` );
  await copyFile( '../decaf/html/splash.gif', `${buildDir}/splash.gif` );

  // Recursively copy ../decaf/html/cheerpj_3.0 to ${buildDir}/cheerpj_3.0

  // Function to create a directory if it doesn't exist
  function ensureDir( dir: string ): void {
    try {
      fs.mkdirSync( dir, { recursive: true } );
    }
    catch( error ) {

      // @ts-expect-error
      if ( error.code !== 'EEXIST' ) {
        throw error;
      } // Ignore the error if the directory already exists
    }
  }

  // Recursive function to copy all files from one directory to another
  async function copyDirRecursive( sourceDir: string, targetDir: string ): Promise<void> {

    ensureDir( targetDir );

    const entries = fs.readdirSync( sourceDir, { withFileTypes: true } );

    for ( const entry of entries ) {
      const sourcePath = path.join( sourceDir, entry.name );
      const targetPath = path.join( targetDir, entry.name );

      if ( entry.isDirectory() ) {
        await copyDirRecursive( sourcePath, targetPath );
      }
      else {
        await copyFile( sourcePath, targetPath );
      }
    }
  }

  const cheerpjDir = `${buildDir}/cheerpj_3.0`;
  ensureDir( cheerpjDir );

  await copyDirRecursive( '../decaf/html/cheerpj_3.0', cheerpjDir );

  const decafSHA = await gitRevParse( 'decaf', 'HEAD' );
  const chipperSHA = await gitRevParse( 'chipper', 'HEAD' );
  const perennialAliasSHA = await gitRevParse( 'perennial-alias', 'HEAD' );
  const perennialSHA = await gitRevParse( 'perennial', 'HEAD' );

  // Please set the svn command line path as appropriate for your system
  const svnInfo = await execute( '/opt/homebrew/bin/svn', [ 'info' ], `${trunkPath}` );

  const dependencies = {
    version: versionString,
    decaf: decafSHA,
    notes: 'The decaf sha is from before the version commit.',
    chipper: chipperSHA,
    'perennial-alias': perennialAliasSHA,
    perennial: perennialSHA,
    svnInfo: svnInfo
  };
  console.log( dependencies );
  await writeJSON( `${buildDir}/dependencies.json`, dependencies );

  if ( flavors.length === 0 ) {
    console.log( `build and ready for local testing: ${urlRoot}/decaf/projects/${project}/build/${project}.html` );
  }
  else {
    console.log( 'build and ready for local testing:' );
    flavors.forEach( flavor => {
      console.log( `build and ready for local testing: ${urlRoot}/decaf/projects/${project}/build/${project}.html?simulation=${flavor}` );
    } );
  }
}