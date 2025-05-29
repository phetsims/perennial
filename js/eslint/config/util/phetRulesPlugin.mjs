// Copyright 2015-2021, University of Colorado Boulder

import additionalBadText from '../../phet-rules/additional-bad-text.js';
import authorAnnotation from '../../phet-rules/author-annotation.js';
import badChipperText from '../../phet-rules/bad-chipper-text.js';
import requireFluent from '../../phet-rules/require-fluent.js';
import badPhetLibraryText from '../../phet-rules/bad-phet-library-text.js';
import badSimText from '../../phet-rules/bad-sim-text.js';
import badText from '../../phet-rules/bad-text.js';
import badTypescriptText from '../../phet-rules/bad-typescript-text.js';
import copyright from '../../phet-rules/copyright.js';
import defaultExportClassShouldRegisterNamespace from '../../phet-rules/default-export-class-should-register-namespace.js';
import defaultExportMatchFilename from '../../phet-rules/default-export-match-filename.js';
import defaultImportMatchFilename from '../../phet-rules/default-import-match-filename.js';
import documentationBeforeImports from '../../phet-rules/documentation-before-imports.js';
import explicitMethodReturnType from '../../phet-rules/explicit-method-return-type.js';
import gruntTaskKebabCase from '../../phet-rules/grunt-task-kebab-case.js';
import importStatementExtensionJs from '../../phet-rules/import-statement-extension-js.js';
import importStatementExtension from '../../phet-rules/import-statement-extension.js';
import jsxTextElementsContainMatchingClass from '../../phet-rules/jsx-text-elements-contain-matching-class.js';
import namespaceMatch from '../../phet-rules/namespace-match.js';
import noHtmlConstructors from '../../phet-rules/no-html-constructors.js';
import noImportFromGruntTasks from '../../phet-rules/no-import-from-grunt-tasks.js';
import noInstanceofArray from '../../phet-rules/no-instanceof-array.js';
import noObjectSpreadOnNonLiterals from '../../phet-rules/no-object-spread-on-non-literals.js';
import noPropertyInRequireStatement from '../../phet-rules/no-property-in-require-statement.js';
import noSimpleTypeCheckingAssertions from '../../phet-rules/no-simple-type-checking-assertions.js';
import noViewImportedFromModel from '../../phet-rules/no-view-imported-from-model.js';
import phetIoObjectOptionsShouldNotPickFromPhetIoObject from '../../phet-rules/phet-io-object-options-should-not-pick-from-phet-io-object.js';
import phetObjectShorthand from '../../phet-rules/phet-object-shorthand.js';
import preferDerivedStringProperty from '../../phet-rules/prefer-derived-string-property.js';
import requirePropertySuffix from '../../phet-rules/require-property-suffix.js';
import requireStatementExtension from '../../phet-rules/require-statement-extension.js';
import requireStatementMatch from '../../phet-rules/require-statement-match.js';
import singleLineImport from '../../phet-rules/single-line-import.js';
import tandemNameShouldMatch from '../../phet-rules/tandem-name-should-match.js';
import todoShouldHaveIssue from '../../phet-rules/todo-should-have-issue.js';
import uppercaseStaticsShouldBeReadonly from '../../phet-rules/uppercase-statics-should-be-readonly.js';
import visibilityAnnotation from '../../phet-rules/visibility-annotation.js';

/**
 * Custom PhET rules for ESLint.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default {
  rules: {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Custom Rules
    //

    'additional-bad-text': additionalBadText,
    'bad-text': badText,
    'bad-chipper-text': badChipperText,
    'bad-phet-library-text': badPhetLibraryText,
    'bad-sim-text': badSimText,
    'require-fluent': requireFluent,
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

    // phet-specific require statement rule
    'require-statement-extension': requireStatementExtension,

    // phet-specific import statement rule
    'import-statement-extension': importStatementExtension,

    // phet-specific import statement rule
    'import-statement-extension-js': importStatementExtensionJs,

    // phet-specific require statement rule
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

    'documentation-before-imports': documentationBeforeImports,

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Type checking rules. Documentation is at the usage site below
    'no-simple-type-checking-assertions': noSimpleTypeCheckingAssertions,
    'explicit-method-return-type': explicitMethodReturnType,
    'require-property-suffix': requirePropertySuffix,
    'uppercase-statics-should-be-readonly': uppercaseStaticsShouldBeReadonly,
    'no-object-spread-on-non-literals': noObjectSpreadOnNonLiterals,
    'phet-io-object-options-should-not-pick-from-phet-io-object': phetIoObjectOptionsShouldNotPickFromPhetIoObject
    //////////////////////////////////////////////
  }
};