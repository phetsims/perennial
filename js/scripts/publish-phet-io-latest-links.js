// Copyright 2023, University of Colorado Boulder

/**
 * Copy an HTML file with all latest PhET-iO published sim links in it.
 *
 * USAGE:
 * cd perennial/
 * node publish-phet-io-latest-links.js ./path/to/public/html/file/
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const fs = require( 'fs' );
const path = require( 'path' );
const getPhetioLinks = require( '../common/getPhetioLinks' );
const assert = require( 'assert' );

( async () => {

  const phetioLinks = await getPhetioLinks();
  const filename = 'index.html';
  const publishPath = process.argv[ 2 ];
  assert( publishPath, 'usage: cd perennial; node js/scripts/publish-phet-io-latest-links.js {{PATH_TO_PUBLISHED_HTML}}' );

  const htmlLinks = phetioLinks.map( link => `<a href="${link}">${link}</a><br/>` );
  const html = `
  <h1>Latest PhET-iO Links</h1>
  ${htmlLinks.join( '\n' )}
  `;
  fs.writeFileSync( path.join( path.resolve( publishPath ), filename ), html );
} )();