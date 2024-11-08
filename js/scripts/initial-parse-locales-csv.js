// Copyright 2021, University of Colorado Boulder

const fs = require( 'fs' );
const csvParser = require( 'csv-parser' );

const filePath = process.argv[ 2 ];

/**
 * Read in the CSV export from the locales spreadsheet ("Final(dev)" format) and parse it into a localeJSON format.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const parseCSV = ( filePath, callback ) => {
  const rows = [];

  fs.createReadStream( filePath )
    .pipe( csvParser() )
    .on( 'data', row => {
      const values = Object.values( row );
      rows.push( values );
    } )
    .on( 'end', () => {
      callback( null, rows );
    } )
    .on( 'error', error => {
      callback( error, null );
    } );
};

parseCSV( filePath, ( error, data ) => {
  if ( error ) {
    console.error( 'Error parsing CSV:', error );
  }
  else {
    const localeMainData = data.map( row => {
      let locale = row[ 1 ];
      let threeLetterLocale = row[ 2 ];
      let englishName = row[ 3 ];
      let localizedName = row[ 4 ];
      let direction = row[ 5 ];
      const fallback = row[ 6 ];
      
      locale = locale.trim();

      if ( locale.length !== 2 && locale.length !== 5 ) {
        throw new Error( `Invalid locale: ${JSON.stringify( locale )}` );
      }

      if ( !locale[ 0 ].match( /[a-z]/ ) ) {
        throw new Error( `Invalid locale: ${locale}` );
      }
      if ( !locale[ 1 ].match( /[a-z]/ ) ) {
        throw new Error( `Invalid locale: ${locale}` );
      }

      if ( locale.length === 5 ) {
        if ( locale[ 2 ] !== '_' ) {
          throw new Error( `Invalid locale: ${locale}` );
        }
        if ( !locale[ 3 ].match( /[A-Z]/ ) ) {
          throw new Error( `Invalid locale: ${locale}` );
        }
        if ( !locale[ 4 ].match( /[A-Z]/ ) ) {
          throw new Error( `Invalid locale: ${locale}` );
        }
      }

      threeLetterLocale = threeLetterLocale.trim(); // remove tab

      if ( threeLetterLocale.length === 5 && locale === threeLetterLocale ) {
        threeLetterLocale = null;
      }
      else if ( threeLetterLocale.length === 0 ) {
        threeLetterLocale = null;
      }

      if ( threeLetterLocale !== null ) {
        if ( threeLetterLocale.length !== 3 ) {
          throw new Error( `Invalid three-letter locale: ${JSON.stringify( row )}` );
        }

        if ( !threeLetterLocale.match( /^[a-z]{3}$/ ) ) {
          throw new Error( `Invalid three-letter locale: ${JSON.stringify( row )}` );
        }
      }

      englishName = englishName.trim().replace( /\u00A0/g, ' ' );

      if ( englishName.length < 1 ) {
        throw new Error( `Invalid English name: ${JSON.stringify( row )}` );
      }

      localizedName = localizedName.trim().replace( /\u00A0/g, ' ' );

      if ( localizedName.length < 1 ) {
        throw new Error( `Invalid localized name: ${JSON.stringify( row )}` );
      }

      // patch in
      if ( locale === 'pt_ST' ) {
        direction = 'ltr';
      }

      if ( direction !== 'ltr' && direction !== 'rtl' ) {
        throw new Error( `Invalid direction: ${JSON.stringify( row )}` );
      }

      const fallbackLocales = fallback.trim().split( ',' ).map( x => x.trim() ).filter( l => l !== 'en' );

      const result = {
        locale: locale
      };

      if ( threeLetterLocale ) {
        result.locale3 = threeLetterLocale;
      }

      result.englishName = englishName;
      result.localizedName = localizedName;
      result.direction = direction;

      if ( fallbackLocales.length ) {
        result.fallbackLocales = fallbackLocales;
      }

      return result;
    } );

    localeMainData.forEach( localeData => {
      localeData.fallbackLocales && localeData.fallbackLocales.forEach( fallbackLocale => {
        if ( !localeMainData.find( x => x.locale === fallbackLocale ) ) {
          throw new Error( `Invalid fallback locale: ${JSON.stringify( localeData )}` );
        }
      } );
    } );

    localeMainData.sort( ( a, b ) => {
      return a.locale.localeCompare( b.locale );
    } );

    const localeInfo = {};

    localeMainData.forEach( localeData => {
      const locale = localeData.locale;
      delete localeData.locale;
      localeInfo[ locale ] = localeData;
    } );

    const localeInfoString = JSON.stringify( localeInfo, null, 2 );
    console.log( localeInfoString );

    // legacy localeInfo.js, that will be propagated to the other copies
    {
      const legacyLocaleInfoPrimaryFilename = '../chipper/js/data/localeInfo.js';

      if ( !fs.existsSync( legacyLocaleInfoPrimaryFilename ) ) {
        throw new Error( `Expected to find ${legacyLocaleInfoPrimaryFilename}` );
      }

      const legacyLocaleInfoPrimary = fs.readFileSync( legacyLocaleInfoPrimaryFilename, 'utf8' );

      const startIndex = legacyLocaleInfoPrimary.indexOf( 'const locales = {' );
      const endIndex = legacyLocaleInfoPrimary.indexOf( 'module.exports = locales;', startIndex );

      if ( startIndex === -1 || endIndex === -1 ) {
        throw new Error( 'Failed to find localeInfo.js locales object' );
      }

      let replacement = 'const locales = {\n';

      for ( const locale in localeInfo ) {
        replacement += `  ${locale}: {\n`;
        replacement += `    name: '${localeInfo[ locale ].englishName.replace( /'/g, '\\\'' )}',\n`;
        replacement += `    localizedName: '${localeInfo[ locale ].localizedName.replace( /'/g, '\\\'' )}',\n`;
        replacement += `    direction: '${localeInfo[ locale ].direction}'\n`;
        replacement += '  },\n';
      }

      replacement += '};\n\n';

      const newLocaleInfoPrimary = legacyLocaleInfoPrimary.substring( 0, startIndex ) + replacement + legacyLocaleInfoPrimary.substring( endIndex );

      fs.writeFileSync( legacyLocaleInfoPrimaryFilename, newLocaleInfoPrimary, 'utf8' );
    }

    // New babel localeData
    {
      const babelExtendedLocaleInfoFilename = '../babel/localeData.json';

      fs.writeFileSync( babelExtendedLocaleInfoFilename, localeInfoString );
    }
  }
} );