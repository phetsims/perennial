// Copyright 2019, University of Colorado Boulder

/**
 * Compare the PDOM html of two versions of the same sim. This is a helpful test to see if there has been any changes
 * to the descriptions. This will test the current working copy (even unstashed changes) against a provided sha.
 *
 * This task works by using the date of the provided sha to checkout the correct shas for each dependency.
 *
 * If the output isn't pretty for you, it may be because of gitbash on Windows. zepumph and twant found a solution by
 * adding `export FORCE_COLOR=true` to his bashrc, see https://stackoverflow.com/questions/32742865/no-console-colors-if-using-npm-script-inside-a-git-bash-mintty/54134326#54134326
 *
 * Currently this script depends on CHIPPER/getPhetLibs. This is not ideal, and means that this script should really only
 * be called from master.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jesse Greenberg (PhET Interactive Simulations)
 * @author Taylor Want (PhET Interactive Simulations)
 */


const execute = require( '../dual/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const getDependencies = require( '../common/getDependencies' );
const assert = require( 'assert' );
const htmlDiffer = require( 'html-differ' ); // eslint-disable-line require-statement-match
const logger = require( 'html-differ/lib/logger' );
const _ = require( 'lodash' ); // eslint-disable-line
const puppeteer = require( 'puppeteer' );
const winston = require( 'winston' );
const withServer = require( '../common/withServer' );

// constants
const HtmlDiffer = htmlDiffer.HtmlDiffer;

module.exports = async ( repo, sha ) => {
  assert( typeof sha === 'string', 'need a sha to compare against' );
  winston.debug( `running pdom comparison in ${repo} between current working copy and ${sha}` );

  const dependencies = Object.keys( getDependencies( repo ) ).filter( key => key !== 'comment' && key !== repo );

  // get the current working copy PDOM
  const workingCopyPDOM = await launchSimAndGetPDOMText( repo );
  assert( workingCopyPDOM, 'should be defined' );

  // keep track of the repos that will need to be unstashed. This is necessary to make sure we don't apply a stash that
  // this task didn't save to begin with,
  // i.e. git stash -> there are no working copy changes -> git stash apply -> previous random stash popped
  const reposThatNeedUnstashing = await stashAll( dependencies );

  const shaDateString = await execute( 'git', [ 'show', '--no-patch', '--no-notes', '--pretty=\'%ci\'', sha ], `../${repo}` );
  const shaDate = shaDateString.split( ' ' )[ 0 ].replace( /-/g, '.' ).replace( '\'', '' );

  const activeRepos = getActiveRepos();

  // checkout-date.sh takes an "opt-out" list of repos that shouldn't be checked out.
  const keepOnMaster = _.without( activeRepos, ...dependencies );
  keepOnMaster.push( 'babel' ); // we don't need to worry about babel, this is only for running in requirejs mode
  keepOnMaster.push( 'perennial' ); // not perennial!

  // checkout date will checkout all needed repos, we don't need to npm update because we are only running in requirejs mode
  await execute( 'sh', [ './perennial/bin/checkout-date.sh', '-m', keepOnMaster, shaDate ], '../' );

  // get the PDOM from the old shas
  const oldShaPDOM = await launchSimAndGetPDOMText( repo );

  await restoreWorkingCopy( dependencies, reposThatNeedUnstashing );

  const htmlDiffer = new HtmlDiffer( {
    ignoreAttributes: [ 'id' ],
    compareAttributesAsJSON: [],
    ignoreWhitespaces: true,
    ignoreComments: true,
    ignoreEndTags: false,
    ignoreDuplicateAttributes: false
  } );

  console.log( 'HTML Diff:' );
  const diff = htmlDiffer.diffHtml( workingCopyPDOM, oldShaPDOM );

  // TODO https://github.com/phetsims/perennial/issues/138 better interpretation of the diff that is output. Perhaps by looking at "diff" more manually, see https://www.npmjs.com/package/html-differ
  console.log( logger.getDiffText( diff, { charsAroundDiff: 40 } ) );
};


/**
 * Checkout master again and unstash changes if they apply
 * @param {Array.<string>} repos
 * @param {Array.<string>} reposThatNeedUnstashing
 * @returns {Promise.<void>}
 */
const restoreWorkingCopy = async ( repos, reposThatNeedUnstashing ) => {

  for ( let i = 0; i < repos.length; i++ ) {
    const repo = repos[ i ];
    await execute( 'git', [ 'checkout', 'master' ], `../${repo}` );
    if ( reposThatNeedUnstashing.includes( repo ) ) {

      // stash working copy changes
      await execute( 'git', [ 'stash', 'apply' ], `../${repo}` );
    }
  }
};

/**
 * Stash working copy changes, keeping track of any repo stashed so it can be unstashed
 * @param {Array.<string>} repos
 * @returns {Promise.<Array.<string>>} - the repos that will need unstashing
 */
const stashAll = async repos => {

  // {Array.<string>} keep track of which repos were stashed
  const needsUnstashing = [];

  for ( let i = 0; i < repos.length; i++ ) {
    const repo = repos[ i ];

    // If there are no local copy changes, then we should not apply stash changes after the old sha's test, so keep track.
    // An exit code of 0 means that there are no working copy changes in the repo

    let shouldStash;
    try {

      await execute( 'git', [ 'diff-index', '--quiet', 'HEAD', '--' ], `../${repo}` );
      shouldStash = false;
    }
    catch( e ) {
      winston.debug( `stashing needed in ${repo}` );
      shouldStash = true;
    }
    if ( shouldStash ) {
      needsUnstashing.push( repo );

      // stash working copy changes
      await execute( 'git', [ 'stash' ], `../${repo}` );
    }
  }
  return needsUnstashing;
};


/**
 * Launch a chrome version, run the simulation, and get the PDOM from the simulation.
 * TODO https://github.com/phetsims/perennial/issues/138 add in functions that can be executed to change the model in between tests.
 * TODO https://github.com/phetsims/perennial/issues/138 maybe we could fuzz a few frames, and then test while setting the random seed to be the same for all pages
 * @param repo
 * @returns {Promise.<string>}
 */
const launchSimAndGetPDOMText = async repo => {

  return withServer( async port => {
    let pdoms = null;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on( 'console', msg => {
      if ( msg.type() === 'error' ) {
        console.error( 'PAGE ERROR:', msg.text() );
      }
      else {
        console.log( 'PAGE LOG:', msg.text() );
      }
    } );

    page.on( 'error', msg => { throw new Error( msg ); } );
    page.on( 'pageerror', msg => { throw new Error( msg ); } );

    try {
      await page.goto( `http://localhost:${port}/${repo}/${repo}_en.html?brand=phet&postMessageOnLoad` );

      pdoms = await page.evaluate( async () => {
        return new Promise( ( resolve, reject ) => {


          // TODO https://github.com/phetsims/perennial/issues/138
          // window.phet.sim.joist.frameEndedEmitter.addListener();

          window.addEventListener( 'message', event => {
            if ( event.data ) {
              try {
                const messageData = JSON.parse( event.data );
                if ( messageData.type === 'load' ) {
                  console.log( 'sim loaded' );
                  resolve( phet.joist.display.pdomRootElement.outerHTML );
                }
              }
              catch( e ) {

                // message isn't what we wanted it to be, so ignore it
                console.log( 'CAUGHT ERROR:', e.message );
              }
            }
            resolve( '' );
          } );
          setTimeout( () => {
            throw new Error( 'Load timeout' );
          }, 20000 );
        } );
      } );
    }
    catch( e ) {
      throw new Error( e );
    }
    finally {
      browser.close();
    }
    return pdoms;
  } );
};

