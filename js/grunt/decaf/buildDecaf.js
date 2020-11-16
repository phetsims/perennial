// Copyright 2017-2019, University of Colorado Boulder

/**
 * Deploys a decaf simulation after incrementing the test version number.  This file ported from dev.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

'use strict';

const execute = require( '../../common/execute' );
const copyFile = require( '../../common/copyFile' );
const getPreloads = require( './getPreloads' );
const SimVersion = require( '../../common/SimVersion' );
const gitRevParse = require( '../../common/gitRevParse' );
const loadJSON = require( '../../common/loadJSON' );
const writeJSON = require( '../../common/writeJSON' );
const fs = require( 'fs' );
const _ = require( 'lodash' ); // eslint-disable-line

// constants
const BUILD_LOCAL_FILENAME = process.env.HOME + '/.phet/build-local.json';
const buildLocalJSON = JSON.parse( fs.readFileSync( BUILD_LOCAL_FILENAME, { encoding: 'utf-8' } ) );
const GIT_ROOT = buildLocalJSON.gitRoot;
const URL_ROOT = buildLocalJSON.urlRoot;
const TRUNK_PATH = buildLocalJSON.decafTrunkPath;

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} project
 * @returns {Promise}
 */
module.exports = async function( project ) {

  console.log( 'building project: ' + project );

  // Command obtained from running in IntelliJ IDEA with the given .project.
  const cmd = [
    '-classpath',

    // Build classes with
    // ~/phet-svn-trunk-2020/build-tools$ chmod u+x ./contrib/apache-ant/bin/ant
    // ~/phet-svn-trunk-2020/build-tools$ ./build.sh
    // Other jars taken from /phet-svn-trunk-2020/build-tools/build-tools-build.properties
    `${TRUNK_PATH}/build-tools/ant_output/phetbuild/classes:${TRUNK_PATH}/build-tools/contrib/proguard/lib/proguard.jar:${TRUNK_PATH}/build-tools/contrib/commons-lang/commons-lang.jar:${TRUNK_PATH}/build-tools/contrib/jsch/jsch.jar:${TRUNK_PATH}/build-tools/contrib/scala/scala-compiler.jar:${TRUNK_PATH}/build-tools/contrib/scala/scala-library.jar:${TRUNK_PATH}/build-tools/contrib/apache-ant/lib/ant.jar:${TRUNK_PATH}/build-tools/contrib/apache-ant/lib/ant-launcher.jar:${TRUNK_PATH}/build-tools/contrib/yuicompressor/yuicompressor-2.4.4.jar:${TRUNK_PATH}/build-tools/contrib/jgit/org.eclipse.jgit-1.1.0.201109151100-r.jar:/Library/Java/JavaVirtualMachines/jdk1.7.0_80.jdk/Contents/Home/lib/tools.jar`,
    'edu.colorado.phet.buildtools.BuildScript',
    TRUNK_PATH,
    project
  ];

  const program = '/Library/Java/JavaVirtualMachines/jdk1.7.0_80.jdk/Contents/Home/bin/java';
  await execute( program, cmd );

  const buildDir = `../decaf/projects/${project}/build/`;
  try {
    fs.mkdirSync( buildDir );
  }
  catch( e ) {
    console.log( 'perhaps the build directory exists' );
  }

  const allJar = `${GIT_ROOT}decaf/projects/${project}/build/${project}_all.jar`;
  await copyFile( `${TRUNK_PATH}/simulations-java/simulations/${project}/deploy/${project}_all.jar`, allJar );
  console.log( 'copied' );

  await execute( '/Applications/cheerpj/cheerpjfy.py', [ allJar ] );
  console.log( 'cheerpjed' );

  const javaProperties = fs.readFileSync( `${TRUNK_PATH}/simulations-java/simulations/${project}/${project}-build.properties`, 'utf-8' );
  const flavors = javaProperties.split( '\n' ).filter( line => line.startsWith( 'project.flavor' ) ).map( line => line.split( '.' )[ 2 ] );
  let url = '';
  if ( flavors.length === 0 ) {
    url = `${URL_ROOT}/decaf/html?project=${project}`;
  }
  else {
    url = `${URL_ROOT}/decaf/html?project=${project}&simulation=${flavors[ 0 ]}`;
  }

  console.log( `awaiting preloads via puppeteer at url = ${url}` );
  const preloadResources = await getPreloads( url );
  console.log( 'We have the preloads!\n' + preloadResources );

  const packageFileRelative = `projects/${project}/package.json`;
  const packageFile = `../decaf/${packageFileRelative}`;
  const packageObject = await loadJSON( packageFile );
  const previousVersion = SimVersion.parse( packageObject.version );

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: 'dev',
    testNumber: previousVersion.testNumber + 1
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

  const stringFiles = fs.readdirSync( `${TRUNK_PATH}/simulations-java/simulations/${project}/data/${project}/localization` );
  const locales = stringFiles.filter( stringFile => stringFile.indexOf( '_' ) >= 0 ).map( file => file.substring( file.indexOf( '_' ) + 1, file.lastIndexOf( '.' ) ) );
  console.log( locales.join( '\n' ) );

  fs.writeFileSync( `${buildDir}/locales.txt`, locales.join( '\n' ) );
  fs.writeFileSync( `${buildDir}/simulations.txt`, flavors.join( '\n' ) );

  await copyFile( '../decaf/html/style.css', `${buildDir}/style.css` );
  await copyFile( '../decaf/html/splash.gif', `${buildDir}/splash.gif` );

  const decafSHA = await gitRevParse( 'decaf', 'HEAD' );
  const chipperSHA = await gitRevParse( 'chipper', 'HEAD' );
  const perennialSHA = await gitRevParse( 'perennial', 'HEAD' );

  const svnInfo = await execute( 'svn', [ 'info' ], `${TRUNK_PATH}` );

  const dependencies = {
    version: versionString,
    decaf: decafSHA,
    notes: 'The decaf sha is from before the version commit.',
    chipper: chipperSHA,
    perennial: perennialSHA,
    svnInfo: svnInfo
  };
  console.log( dependencies );
  await writeJSON( `${buildDir}/dependencies.json`, dependencies );

  if ( flavors.length === 0 ) {
    console.log( `build and ready for local testing: ${URL_ROOT}/decaf/projects/${project}/build/${project}.html` );
  }
  else {
    console.log( 'build and ready for local testing:' );
    flavors.forEach( flavor => {
      console.log( `build and ready for local testing: ${URL_ROOT}/decaf/projects/${project}/build/${project}.html?simulation=${flavor}` );
    } );
  }
};
