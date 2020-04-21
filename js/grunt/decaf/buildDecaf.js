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

const TRUNK = '/Users/samreid/phet-svn-trunk-2020';
/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} project
 * @returns {Promise}
 */
module.exports = async function( project ) {

  console.log( 'building project: ' + project );

  // // // Command obtained from running in IntelliJ IDEA with the given .project.
  await execute( '/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/bin/java', [
      '-Dfile.encoding=UTF-8',
      '-classpath',
      '/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/charsets.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/deploy.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/cldrdata.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/dnsns.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/jaccess.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/jfxrt.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/localedata.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/nashorn.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/sunec.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/sunjce_provider.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/sunpkcs11.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/ext/zipfs.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/javaws.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/jce.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/jfr.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/jfxswt.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/jsse.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/management-agent.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/plugin.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/resources.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/jre/lib/rt.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/ant-javafx.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/dt.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/javafx-mx.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/jconsole.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/packager.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/sa-jdi.jar:/Library/Java/JavaVirtualMachines/jdk1.8.0_241.jdk/Contents/Home/lib/tools.jar:/Users/samreid/phet-svn-trunk-2020-output/production/build-tools:/Users/samreid/phet-svn-trunk-2020-output/production/flash-launcher:/Users/samreid/phet-svn-trunk-2020/simulations-flash/flash-launcher/data:/Users/samreid/phet-svn-trunk-2020-output/production/phetcommon:/Users/samreid/phet-svn-trunk-2020/simulations-java/common/phetcommon/data:/Users/samreid/phet-svn-trunk-2020/simulations-java/contrib/junit/junit.jar:/Users/samreid/phet-svn-trunk-2020/simulations-java/contrib/javaws/jnlp.jar:/Users/samreid/phet-svn-trunk-2020-output/production/think-tank-maths:/Users/samreid/phet-svn-trunk-2020/simulations-java/contrib/mongodb/mongo-2.7.2.jar:/Users/samreid/phet-svn-trunk-2020/simulations-java/contrib/lombok/lombok.jar:/Users/samreid/phet-svn-trunk-2020/simulations-java/contrib/functionaljava/functionaljava-3.1.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/jsch/jsch.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/apache-ant/lib/ant.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/proguard/lib/proguard.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/yuicompressor/yuicompressor-2.4.4.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/scala/scala-library.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/scala/scala-compiler.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/apache-ant/lib/ant-launcher.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/commons-lang/commons-lang.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/jgit/org.eclipse.jgit-1.1.0.201109151100-r.jar:/Users/samreid/phet-svn-trunk-2020/build-tools/contrib/closure-compiler/compiler.jar',
      'edu.colorado.phet.buildtools.BuildScript',
      TRUNK,
      project
    ]
  );
  console.log( 'Java build complete' );

  const allJar = `/Users/samreid/apache-document-root/main/decaf/projects/${project}/build/${project}_all.jar`;
  await copyFile( `${TRUNK}/simulations-java/simulations/${project}/deploy/${project}_all.jar`, allJar );
  console.log( 'copied' );

  await execute( '/Applications/cheerpj/cheerpjfy.py', [ allJar ] );
  console.log( 'cheerpjed' );

  const url = `http://localhost/main/decaf/html?project=${project}`;
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
  const buildDir = `../decaf/projects/${project}/build/`;
  try {
    fs.mkdirSync( buildDir );
  }
  catch( e ) {
    console.log( 'perhaps the build directory exists' );
  }
  fs.writeFileSync( `${buildDir}/${project}.html`, html );

  await copyFile( '../decaf/html/style.css', `${buildDir}/style.css` );
  await copyFile( '../decaf/html/splash.gif', `${buildDir}/splash.gif` );

  const decafSHA = await gitRevParse( 'decaf', 'HEAD' );
  const chipperSHA = await gitRevParse( 'chipper', 'HEAD' );

  const svnInfo = await execute( 'svn', [ 'info' ], '/Users/samreid/phet-svn-trunk-2020' );

  const dependencies = {
    version: versionString,
    decaf: decafSHA,
    notes: 'The decaf sha is from before the version commit.',
    chipper: chipperSHA,
    svnInfo: svnInfo
  };
  console.log( dependencies );
  await writeJSON( `${buildDir}/dependencies.json`, dependencies );

  console.log( `build and ready for local testing: http://localhost/main/decaf/projects/${project}/build/${project}.html` );
};
