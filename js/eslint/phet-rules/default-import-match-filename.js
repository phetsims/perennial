/* eslint-disable phet/copyright */

/**
 * Adapted/copied from rule in https://github.com/minseoksuh/eslint-plugin-consistent-default-export-name/blob/de812b2194ca9435920776119a7f732b596b4d8b/lib/rules/default-import-match-filename.js
 * Simplified and striped of some logic not needed for PhET's context.
 *
 * @author Chiawen Chen (github: @golopot)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const path = require( 'path' );
const _ = require( 'lodash' );

/**
 * @param {string} filename
 * @returns {string}
 */
function removeExtension( filename ) {
  return path.basename( filename, path.extname( filename ) );
}

function matchesCamelCase( localName, filenameWithoutExtension ) {
  return localName === _.camelCase( filenameWithoutExtension );
}

/**
 * Test if local name matches filename.
 * @param {string} localName
 * @param {string} filename
 * @returns {boolean}
 */
function isCompatible( localName, filename ) {

  const fileWithoutExtension = removeExtension( filename );

  // if they are different, but only by case, that likely indicates a problem
  if ( localName !== fileWithoutExtension && localName.toLowerCase() === fileWithoutExtension.toLowerCase() ) {
    return false;
  }

  return localName === fileWithoutExtension ||
         matchesCamelCase( localName, fileWithoutExtension ) ||
         localName === '_'; // lodash is allowed to be named differently
}

/**
 * Match 'foo' and '@foo/bar' but not 'foo/bar.js', './foo', or '@foo/bar/a.js'
 * @param {string} filePath
 * @returns {boolean}
 */
function isBarePackageImport( filePath ) {
  return (
    ( filePath !== '.' &&
      filePath !== '..' &&
      !filePath.includes( '/' ) &&
      !filePath.startsWith( '@' ) ) ||
    /@[^/]+\/[^/]+$/.test( filePath )
  );
}

/**
 * Match paths consisting of only '.' and '..', like '.', './', '..', '../..'.
 * @param {string} filePath
 * @returns {boolean}
 */
function isAncestorRelativePath( filePath ) {
  return (
    filePath.length > 0 &&
    !filePath.startsWith( '/' ) &&
    filePath
      .split( /[/\\]/ )
      .every(
        segment =>
          segment === '..' || segment === '.' || segment === ''
      )
  );
}

/**
 * @param {string} packageJsonPath
 * @returns {string | undefined}
 */
function getPackageJsonName( packageJsonPath ) {
  try {
    return require( packageJsonPath ).name || undefined;
  }
  catch( e ) {
    return undefined;
  }
}

function getNameFromPackageJsonOrDirname( filePath, context ) {
  const directoryName = path.join( context.getFilename(), filePath, '..' );
  const packageJsonPath = path.join( directoryName, 'package.json' );
  const packageJsonName = getPackageJsonName( packageJsonPath );
  return packageJsonName || path.basename( directoryName );
}

/**
 * Get filename from a path.
 * @param {string} filePath
 * @param {object} context
 * @returns {string | undefined}
 */
function getFilename( filePath, context ) {
  // like require('lodash')
  if ( isBarePackageImport( filePath ) ) {
    return undefined;
  }

  const basename = path.basename( filePath );

  const isDir = /^index$|^index\./.test( basename );
  const processedPath = isDir ? path.dirname( filePath ) : filePath;

  // like require('.'), require('..'), require('../..')
  if ( isAncestorRelativePath( processedPath ) ) {
    return getNameFromPackageJsonOrDirname( processedPath, context );
  }

  return path.basename( processedPath ) + ( isDir ? '/' : '' );
}

module.exports = {
  create: function( context ) {

    return {
      ImportDeclaration( node ) {
        const defaultImportSpecifier = node.specifiers.find(
          ( { type } ) => type === 'ImportDefaultSpecifier'
        );

        const defaultImportName =
          defaultImportSpecifier && defaultImportSpecifier.local.name;

        if ( !defaultImportName ) {
          return;
        }

        const filename = getFilename( node.source.value, context );

        if ( !filename ) {
          return;
        }

        if (
          !isCompatible( defaultImportName, filename )
        ) {
          context.report( {
            node: defaultImportSpecifier,
            message: `Default import name does not match filename "${filename}".`
          } );
        }
      }
    };
  }
};