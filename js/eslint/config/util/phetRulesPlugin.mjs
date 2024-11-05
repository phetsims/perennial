// Copyright 2015-2021, University of Colorado Boulder

import additionalBadText from '../../rules/additional-bad-text.js';
import authorAnnotation from '../../rules/author-annotation.js';
import badChipperText from '../../rules/bad-chipper-text.js';
import badPhetLibraryText from '../../rules/bad-phet-library-text.js';
import badSimText from '../../rules/bad-sim-text.js';
import badText from '../../rules/bad-text.js';
import badTypescriptText from '../../rules/bad-typescript-text.js';
import copyright from '../../rules/copyright.js';
import defaultExportClassShouldRegisterNamespace from '../../rules/default-export-class-should-register-namespace.js';
import defaultExportMatchFilename from '../../rules/default-export-match-filename.js';
import defaultImportMatchFilename from '../../rules/default-import-match-filename.js';
import explicitMethodReturnType from '../../rules/explicit-method-return-type.js';
import gruntTaskKebabCase from '../../rules/grunt-task-kebab-case.js';
import jsxTextElementsContainMatchingClass from '../../rules/jsx-text-elements-contain-matching-class.js';
import namespaceMatch from '../../rules/namespace-match.js';
import noHtmlConstructors from '../../rules/no-html-constructors.js';
import noImportFromGruntTasks from '../../rules/no-import-from-grunt-tasks.js';
import noInstanceofArray from '../../rules/no-instanceof-array.js';
import noObjectSpreadOnNonLiterals from '../../rules/no-object-spread-on-non-literals.js';
import noPropertyInRequireStatement from '../../rules/no-property-in-require-statement.js';
import noSimpleTypeCheckingAssertions from '../../rules/no-simple-type-checking-assertions.js';
import noViewImportedFromModel from '../../rules/no-view-imported-from-model.js';
import phetIoObjectOptionsShouldNotPickFromPhetIoObject from '../../rules/phet-io-object-options-should-not-pick-from-phet-io-object.js';
import phetObjectShorthand from '../../rules/phet-object-shorthand.js';
import preferDerivedStringProperty from '../../rules/prefer-derived-string-property.js';
import requirePropertySuffix from '../../rules/require-property-suffix.js';
import requireStatementMatch from '../../rules/require-statement-match.js';
import singleLineImport from '../../rules/single-line-import.js';
import tandemNameShouldMatch from '../../rules/tandem-name-should-match.js';
import todoShouldHaveIssue from '../../rules/todo-should-have-issue.js';
import uppercaseStaticsShouldBeReadonly from '../../rules/uppercase-statics-should-be-readonly.js';
import visibilityAnnotation from '../../rules/visibility-annotation.js';

/**
 * Custom PhET rules for ESLint.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default {

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Custom Rules
  //

  'additional-bad-text': additionalBadText,
  'bad-text': badText,
  'bad-chipper-text': badChipperText,
  'bad-phet-library-text': badPhetLibraryText,
  'bad-sim-text': badSimText,
  'bad-typescript-text': badTypescriptText,

  copyright: copyright,
  // Custom rule for checking the copyright.copyright

  // Custom rule for checking TO-DOs have issues
  'todo-should-have-issue': todoShouldHaveIssue,

  // Custom rule for ensuring that images and text use scenery node
  'no-html-constructors': noHtmlConstructors,

  // Custom rule for avoiding instanceof Array.
  'no-instanceof-array': noInstanceofArray,

  // Custom rule for keeping import statements on a single line.
  'single-line-import': singleLineImport,

  // method declarations must have a visibility annotation
  'visibility-annotation': visibilityAnnotation,

  // key and value arguments to namespace.register() must match
  'namespace-match': namespaceMatch,

  // phet-specific require statement rules
  'require-statement-match': requireStatementMatch,

  // Require @public/@private for this.something = result;
  'no-property-in-require-statement': noPropertyInRequireStatement,

  // never allow object shorthand for properties, functions are ok.
  'phet-object-shorthand': phetObjectShorthand,

  // a default import variable name should be the same as the filename
  'default-import-match-filename': defaultImportMatchFilename,

  // When the default export of a file is a class, it should have a namespace register call
  'default-export-class-should-register-namespace': defaultExportClassShouldRegisterNamespace,

  // Importing the view from the model, uh oh. TODO: This is still in discussion, numerous repos opt out, see: https://github.com/phetsims/chipper/issues/1385
  'no-view-imported-from-model': noViewImportedFromModel,

  // Class names should match filename when exported.
  'default-export-match-filename': defaultExportMatchFilename,

  // Use DerivedStringProperty for its PhET-iO benefits and consistency, see https://github.com/phetsims/phet-io/issues/1943
  'prefer-derived-string-property': preferDerivedStringProperty,

  // A variable or attribute name should generally match the tandem name.
  'tandem-name-should-match': tandemNameShouldMatch,

  // Each source file should list at least one author
  'author-annotation': authorAnnotation,

  // Used for the website code, do not remove!
  'jsx-text-elements-contain-matching-class': jsxTextElementsContainMatchingClass,

  // Used for grunt sub-process Typescript pattern
  'no-import-from-grunt-tasks': noImportFromGruntTasks,

  // Used for kebab-case convention for grunt tasks
  'grunt-task-kebab-case': gruntTaskKebabCase,

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Type checking rules. Documentation is at the usage site below
  'no-simple-type-checking-assertions': noSimpleTypeCheckingAssertions,
  'explicit-method-return-type': explicitMethodReturnType,
  'require-property-suffix': requirePropertySuffix,
  'uppercase-statics-should-be-readonly': uppercaseStaticsShouldBeReadonly,
  'no-object-spread-on-non-literals': noObjectSpreadOnNonLiterals,
  'phet-io-object-options-should-not-pick-from-phet-io-object': phetIoObjectOptionsShouldNotPickFromPhetIoObject
  //////////////////////////////////////////////
};