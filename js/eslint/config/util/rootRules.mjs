// Copyright 2015-2021, University of Colorado Boulder

/**
 * The rules are organized like they are in the list at https://eslint.org/docs/rules/
 * First by type, then alphabetically within type
 * Explicitly list all rules so it is easy to see what's here and to keep organized
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default {

  ////////////////////////////////////////////////////////////////////
  // Possible Problems
  // These rules relate to possible logic errors in code:

  // Enforce return statements in callbacks of array methods
  'array-callback-return': 'error',

  // Require `super()` calls in constructors
  'constructor-super': 'error',

  // Enforce "for" loop update clause moving the counter in the right direction.
  'for-direction': 'error',

  // Enforce `return` statements in getters
  'getter-return': 'error',

  // Disallow using an async function as a Promise executor
  'no-async-promise-executor': 'error',

  // Disallow `await` inside of loops
  'no-await-in-loop': 'off', // We use await in loops all the time in build tools

  // Disallow reassigning class members
  'no-class-assign': 'error',

  // Disallow comparing against -0
  'no-compare-neg-zero': 'error',

  // Disallow assignment operators in conditional expressions
  'no-cond-assign': 'error',

  // Disallow reassigning `const` variables
  'no-const-assign': 'error',

  // Disallow expressions where the operation doesn't affect the value
  'no-constant-binary-expression': 'error',

  // Disallow constant expressions in conditions
  'no-constant-condition': 'error',

  // Disallow returning value from constructor
  'no-constructor-return': 'error',

  // Disallow control characters in regular expressions
  'no-control-regex': 'error',

  // Disallow the use of `debugger`
  'no-debugger': 'error',

  // Disallow duplicate arguments in `function` definitions
  'no-dupe-args': 'error',

  // Disallow duplicate class members
  'no-dupe-class-members': 'error',

  // Disallow duplicate conditions in if-else-if chains
  'no-dupe-else-if': 'error',

  // Disallow duplicate keys in object literals
  'no-dupe-keys': 'error',

  // Disallow duplicate case labels
  'no-duplicate-case': 'error',

  // Disallow duplicate module imports
  'no-duplicate-imports': 'off', // WebStorm typically tells us if we have duplicate imports, and we sometimes add 2 imports from scenery due to its export pattern

  // Disallow empty character classes in regular expressions
  'no-empty-character-class': 'error',

  // Disallow empty destructuring patterns
  'no-empty-pattern': 'error',

  // Disallow reassigning exceptions in `catch` clauses
  'no-ex-assign': 'error',

  // Disallow fallthrough of `case` statements
  'no-fallthrough': 'error',

  // Disallow reassigning `function` declarations
  'no-func-assign': 'error',

  // Disallow assigning to imported bindings
  'no-import-assign': 'error',

  // Disallow variable or `function` declarations in nested blocks
  'no-inner-declarations': 'error',

  // Disallow invalid regular expression strings in `RegExp` constructors
  'no-invalid-regexp': 'error',

  // Disallow irregular whitespace
  'no-irregular-whitespace': 'error',

  // Disallow literal numbers that lose precision
  'no-loss-of-precision': 'error',

  // Disallow characters which are made with multiple code points in character
  // class syntax
  'no-misleading-character-class': 'error',

  // Disallow `new` operators with the `Symbol` object
  'no-new-symbol': 'error',

  // Disallow calling global object properties as functions
  'no-obj-calls': 'error',

  // Disallow returning values from Promise executor functions
  'no-promise-executor-return': 'off', // We turn this rule off so you can use an arrow function as an executor

  // Disallow calling some `Object.prototype` methods directly on objects
  'no-prototype-builtins': 'off', // We prefer `foo.hasOwnProperty("bar");` to `Object.prototype.hasOwnProperty.call(foo, "bar");`

  // Disallow assignments where both sides are exactly the same
  'no-self-assign': 'error',

  // Disallow comparisons where both sides are exactly the same
  'no-self-compare': 'error',

  // Disallow returning values from setters
  'no-setter-return': 'error',

  // Disallow sparse arrays
  'no-sparse-arrays': 'error',

  // Disallow template literal placeholder syntax in regular strings
  'no-template-curly-in-string': 'error',

  // Disallow `this`/`super` before calling `super()` in constructors
  'no-this-before-super': 'error',

  // Disallow the use of undeclared variables unless mentioned in `/*global */` comments
  'no-undef': 'error',

  // Disallow confusing multiline expressions
  'no-unexpected-multiline': 'error', // Avoid code that looks like two expressions but is actually one

  // Disallow unmodified loop conditions
  'no-unmodified-loop-condition': 'error',

  // Disallow unreachable code after `return`, `throw`, `continue`, and `break` statements
  'no-unreachable': 'error',

  // Disallow loops with a body that allows only one iteration
  'no-unreachable-loop': 'error',

  // Disallow control flow statements in `finally` blocks
  'no-unsafe-finally': 'error',

  // Disallow negating the left operand of relational operators
  'no-unsafe-negation': 'error',

  // Disallow use of optional chaining in contexts where the `undefined` value is not allowed
  'no-unsafe-optional-chaining': 'error',

  // Disallow unused private class members
  'no-unused-private-class-members': 'error',

  // Disallow unused variables
  'no-unused-vars': [ // Overridden to allow unused args
    'error',
    {
      vars: 'all',
      args: 'none',
      caughtErrors: 'none'
    }
  ],

  // Disallow the use of variables before they are defined
  'no-use-before-define': 'off', // We often declare auxiliary classes at the bottom of a file, which are used in the primary class

  // Disallow useless backreferences in regular expressions
  'no-useless-backreference': 'error',

  // Disallow assignments that can lead to race conditions due to usage of `await` or `yield`
  'require-atomic-updates': 'error',

  // Require calls to `isNaN()` when checking for `NaN`
  'use-isnan': 'error',

  // Enforce comparing `typeof` expressions against valid strings
  'valid-typeof': 'error',

  ////////////////////////////////////////////////////////////////
  // Suggestions
  // These rules suggest alternate ways of doing things:

  // Enforce getter and setter pairs in objects and classes
  'accessor-pairs': 'off', // Only 17 fails, but I'm not sure we need this.  Perhaps once it bites us we will change our mind?

  // Require braces around arrow function bodies
  'arrow-body-style': 'off', // OK to have braces or not braces

  // Enforce the use of variables within the scope they are defined
  'block-scoped-var': 'off', // We have too much old code with var i being used across several loops.

  // Enforce camelcase naming convention
  camelcase: 'off', // 3512 occurrences March 2021

  // Enforce or disallow capitalization of the first letter of a comment
  'capitalized-comments': 'off',

  // Enforce that class methods utilize `this`
  'class-methods-use-this': 'off', // We have many overrideable methods that just throw an error

  // Enforce a maximum cyclomatic complexity allowed in a program
  complexity: 'off', // We have around 242 offenders as of March, 2021

  // Require `return` statements to either always or never specify values
  'consistent-return': 'error',

  // Enforce consistent naming when capturing the current execution context
  'consistent-this': [ 'error', 'self' ],

  // Enforce consistent brace style for all control statements
  curly: 'error',

  // Require `default` cases in `switch` statements
  'default-case': 'error',

  // Enforce default clauses in switch statements to be last
  'default-case-last': 'error',

  // Enforce default parameters to be last
  'default-param-last': 'error',

  // Enforce dot notation whenever possible
  'dot-notation': 'error',

  // Require the use of `===` and `!==`
  eqeqeq: 'error',

  // Require function names to match the name of the variable or property to which they are assigned
  'func-name-matching': [ 'error', 'always', {
    includeCommonJSModuleExports: false,
    considerPropertyDescriptor: true
  } ],

  // Require or disallow named `function` expressions
  'func-names': 'off', // we sometimes name our functions for debugging

  // Enforce the consistent use of either `function` declarations or expressions
  'func-style': 'off', // 1179 occurrences on March 2021

  // Require grouped accessor pairs in object literals and classes
  'grouped-accessor-pairs': 'off', // In scenery, we group all the getters together, then the setters together

  // Require `for-in` loops to include an `if` statement
  'guard-for-in': 'off', // This hasn't bit us yet

  // Disallow specified identifiers
  'id-denylist': 'error',

  // Enforce minimum and maximum identifier lengths
  'id-length': 'off',

  // Require identifiers to match a specified regular expression
  'id-match': 'error',

  // Require or disallow initialization in variable declarations
  'init-declarations': 'off', // 1286 failures as of March 2021

  // Enforce a maximum number of classes per file
  'max-classes-per-file': 'off', // have as many as you need!

  // Enforce a maximum depth that blocks can be nested
  'max-depth': 'off', // Go for it!

  // Enforce a maximum number of lines per file
  'max-lines': 'off', // Go for it!

  // Enforce a maximum number of lines of code in a function
  'max-lines-per-function': 'off', // Go for it!

  // Enforce a maximum depth that callbacks can be nested
  'max-nested-callbacks': 'error',

  // Enforce a maximum number of parameters in function definitions
  'max-params': 'off',

  // Enforce a maximum number of statements allowed in function blocks
  'max-statements': 'off',

  // Enforce a particular style for multiline comments
  'multiline-comment-style': 'off',

  // Require constructor names to begin with a capital letter
  'new-cap': [ 'error', {
    newIsCap: true,
    newIsCapExceptionPattern: '^(options|this|window)\\.\\w+', // Allow constructors to be passed through options.
    newIsCapExceptions: [ 'rsync', 'jimp', 'Math.seedrandom' ],
    capIsNew: false,
    capIsNewExceptions: [ 'Immutable.Map', 'Immutable.Set', 'Immutable.List' ]
  } ],

  // Disallow the use of `alert`, `confirm`, and `prompt`
  'no-alert': 'off', // We sometimes use this when necessary

  // Disallow `Array` constructors
  'no-array-constructor': 'error',

  // Disallow bitwise operators
  'no-bitwise': 'error',

  // Disallow the use of `arguments.caller` or `arguments.callee`
  'no-caller': 'error',

  // Disallow lexical declarations in case clauses
  'no-case-declarations': 'error',

  // Disallow arrow functions where they could be confused with comparisons
  'no-confusing-arrow': 'off', // 31 occurrences, didn't seem too bad

  // Disallow the use of `console`
  'no-console': 'off', // We like to be able to commit console.log

  // Disallow `continue` statements
  'no-continue': 'off', // 57 continues as of March 2021

  // Disallow deleting variables
  'no-delete-var': 'error',

  // Disallow division operators explicitly at the beginning of regular expressions
  'no-div-regex': 'error',

  // Disallow `else` blocks after `return` statements in `if` statements
  'no-else-return': 'off', // Allow the extra else for symmetry

  // Disallow empty block statements
  'no-empty': 'error',

  // Disallow empty functions
  'no-empty-function': 'off', // It is natural and convenient to specify empty functions instead of having to share a lodash _.noop

  // Disallow `null` comparisons without type-checking operators
  'no-eq-null': 'error',

  // Disallow the use of `eval()`
  'no-eval': 'error',

  // Disallow extending native types
  'no-extend-native': 'error',

  // Disallow unnecessary calls to `.bind()`
  'no-extra-bind': 'error',

  // Disallow unnecessary boolean casts
  'no-extra-boolean-cast': 'error',

  // Disallow unnecessary labels
  'no-extra-label': 'error',

  // Disallow unnecessary semicolons
  'no-extra-semi': 'error',

  // Disallow leading or trailing decimal points in numeric literals
  'no-floating-decimal': 'error',

  // Disallow assignments to native objects or read-only global variables
  'no-global-assign': 'error',

  // Disallow shorthand type conversions
  'no-implicit-coercion': 'off', // We like using !!value and number+''.  Maybe one day we will turn this rule on

  // Disallow declarations in the global scope
  'no-implicit-globals': 'error',

  // Disallow the use of `eval()`-like methods
  'no-implied-eval': 'error',

  // Disallow inline comments after code
  'no-inline-comments': 'off',

  // Disallow use of `this` in contexts where the value of `this` is `undefined`
  'no-invalid-this': 'off', // We have too much old code that uses functions with this (outside of classes)

  // Disallow the use of the `__iterator__` property
  'no-iterator': 'error',

  // Disallow labels that share a name with a variable
  'no-label-var': 'error',

  // Disallow labeled statements
  'no-labels': 'error',

  // Disallow unnecessary nested blocks
  'no-lone-blocks': 'off', // Even though lone blocks are currently rare for our project, we agree they are appropriate in some situations.  Details are in https://github.com/phetsims/chipper/issues/1026

  // Disallow `if` statements as the only statement in `else` blocks
  'no-lonely-if': 'off', // Sometimes this seems more readable or symmetric

  // Disallow function declarations that contain unsafe references inside loop statements
  'no-loop-func': 'off', // It seems we are dealing with this safely, we have 38 occurrences on March 2021

  // Disallow magic numbers
  'no-magic-numbers': 'off', // We have many magic numbers

  // Disallow mixed binary operators
  'no-mixed-operators': 'off',  // 3+2/4 should be allowed

  // Disallow use of chained assignment expressions
  'no-multi-assign': [ 'error', { ignoreNonDeclaration: true } ],

  // Disallow multiline strings
  'no-multi-str': 'error',

  // Disallow negated conditions
  'no-negated-condition': 'off', // sometimes a negated condition is clearer

  // Disallow nested ternary expressions
  'no-nested-ternary': 'off', // Go for it!

  // Disallow `new` operators outside of assignments or comparisons
  'no-new': 'error',

  // Disallow `new` operators with the `Function` object
  'no-new-func': 'error',

  // Disallow `Object` constructors
  'no-new-object': 'error',

  // Disallow `new` operators with the `String`, `Number`, and `Boolean` objects
  'no-new-wrappers': 'error',

  // Disallow `\8` and `\9` escape sequences in string literals
  'no-nonoctal-decimal-escape': 'error',

  // Disallow octal literals
  'no-octal': 'error',

  // Disallow octal escape sequences in string literals
  'no-octal-escape': 'error',

  // Disallow reassigning `function` parameters
  'no-param-reassign': 'off', // We reassign options frequently

  // Disallow the unary operators `++` and `--`
  'no-plusplus': 'off',

  // Disallow the use of the `__proto__` property
  'no-proto': 'error',

  // Disallow variable redeclaration
  'no-redeclare': 'error',

  // Disallow multiple spaces in regular expressions
  'no-regex-spaces': 'error',

  // Disallow specified names in exports
  'no-restricted-exports': 'error',

  // Disallow specified global variables
  'no-restricted-globals': 'error',

  // // Disallow specified modules when loaded by `import`, commented out until there are imports to restrict everywhere.
  // NOTE! There is already a usage of this for node configuration. Be careful about how this overrides.
  // 'no-restricted-imports': 'error',

  // Disallow certain properties on certain objects
  'no-restricted-properties': 'error',

  // Disallow specified syntax
  'no-restricted-syntax': [
    'off',

    { // We allow for...in loops at dev discretion.
      selector: 'ForInStatement',
      message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.'
    },
    { // We allow for...of loops at dev discretion.
      selector: 'ForOfStatement',
      message: 'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.'
    },
    { // Duplicate of the no-labels rule
      selector: 'LabeledStatement',
      message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.'
    },
    { // Duplicate of no-with rule
      selector: 'WithStatement',
      message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.'
    }
  ],

  // Disallow assignment operators in `return` statements
  'no-return-assign': 'error',

  // Disallow unnecessary `return await`
  'no-return-await': 'error',

  // Disallow `javascript:` urls
  'no-script-url': 'error',

  // Disallow comma operators
  'no-sequences': 'error',

  // Disallow variable declarations from shadowing variables declared in the outer scope
  'no-shadow': 'off', // We have 462 shadows as of March, 2021

  // Disallow identifiers from shadowing restricted names
  'no-shadow-restricted-names': 'error',

  // Disallow ternary operators
  'no-ternary': 'off', // PhET loves the ternary

  // Disallow throwing literals as exceptions
  'no-throw-literal': 'error',

  // Disallow initializing variables to `undefined`
  'no-undef-init': 'error',

  // Disallow the use of `undefined` as an identifier
  'no-undefined': 'off', // 608 fails as of March 2021

  // Disallow dangling underscores in identifiers
  'no-underscore-dangle': 'off', // We often use this for private variables

  // Disallow ternary operators when simpler alternatives exist
  'no-unneeded-ternary': 'error',

  // Disallow unused expressions
  'no-unused-expressions': 'off', // This blocks things like circuitNode && circuitNode.circuit.circuitChangedEmitter.removeListener( updateText );

  // Disallow unused labels
  'no-unused-labels': 'error',

  // Disallow unnecessary calls to `.call()` and `.apply()`
  'no-useless-call': 'error',

  // Disallow unnecessary `catch` clauses
  'no-useless-catch': 'error',

  // Disallow unnecessary computed property keys in objects and classes
  'no-useless-computed-key': 'error',

  // Disallow unnecessary concatenation of literals or template literals
  'no-useless-concat': 'error',

  // Disallow unnecessary constructors
  'no-useless-constructor': 'off', // We determined the useless constructors are good for documentation and clarity.

  // Disallow unnecessary escape characters
  'no-useless-escape': 'error',

  // Disallow renaming import, export, and destructured assignments to the same name
  'no-useless-rename': 'error',

  // Disallow redundant return statements
  'no-useless-return': 'error',

  // Require `let` or `const` instead of `var`
  'no-var': 'error',

  // Disallow `void` operators
  'no-void': 'error',

  // Disallow specified warning terms in comments
  'no-warning-comments': 'off', // We don't want TO-DOs to be lint errors

  // Disallow `with` statements
  'no-with': 'error',

  // Require or disallow method and property shorthand syntax for object literals
  'object-shorthand': [ 'off', 'never' ], // PhET has a rule phet-object-shorthand that detects this in object literals

  // Enforce variables to be declared either together or separately in functions
  'one-var': [ 'error', 'never' ], // See #390

  // Require or disallow newlines around variable declarations
  'one-var-declaration-per-line': [ 'error', 'always' ],

  // Require or disallow assignment operator shorthand where possible
  'operator-assignment': 'off', // Operator assignment can often be harder to read

  // Require using arrow functions for callbacks
  'prefer-arrow-callback': 'error',

  // Require `const` declarations for variables that are never reassigned after declared
  'prefer-const': [ // error when let is used but the variable is never reassigned, see https://github.com/phetsims/tasks/issues/973
    'error',
    {
      destructuring: 'any',
      ignoreReadBeforeAssign: false
    }
  ],

  // Require destructuring from arrays and/or objects
  'prefer-destructuring': 'off', // const {CURVE_X_RANGE} = CalculusGrapherConstants; seems worse than const CURVE_X_RANGE = CalculusGrapherConstants.CURVE_X_RANGE;

  // Disallow the use of `Math.pow` in favor of the `**` operator
  'prefer-exponentiation-operator': 'off', // Math.pow() seems very clear.

  // Enforce using named capture group in regular expression
  'prefer-named-capture-group': 'off', // We have many occurrences in yotta/js/apacheParsing.js

  // Disallow `parseInt()` and `Number.parseInt()` in favor of binary, octal, and hexadecimal literals
  'prefer-numeric-literals': 'error',

  // Disallow use of `Object.prototype.hasOwnProperty.call()` and prefer use of `Object.hasOwn()`
  'prefer-object-has-own': 'error',

  // Disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead.
  'prefer-object-spread': 'off', // The fix for this says "unexpected token", so let's go without it.

  // Require using Error objects as Promise rejection reasons
  'prefer-promise-reject-errors': 'error',

  // Disallow use of the `RegExp` constructor in favor of regular expression literals
  'prefer-regex-literals': 'off', // new RegExp() looks natural to me

  // Require rest parameters instead of `arguments`
  'prefer-rest-params': 'error',

  // Require spread operators instead of `.apply()`
  'prefer-spread': 'error',

  // Require template literals instead of string concatenation
  'prefer-template': 'off', // We decided it is convenient to sometimes use string concatenation, see discussion in https://github.com/phetsims/chipper/issues/1027

  // require quotes around object literal property names
  'quote-props': [ 'error', 'as-needed', { keywords: false, unnecessary: true, numbers: false } ],

  // Enforce the consistent use of the radix argument when using `parseInt()`
  radix: 'error',

  // Disallow async functions which have no `await` expression
  'require-await': 'off', // 59 errors as of 7/21, but we will keep off, see https://github.com/phetsims/chipper/issues/1028

  // Enforce the use of `u` flag on RegExp
  'require-unicode-regexp': 'off', // TODO: Discuss: 272 fails or so, https://github.com/phetsims/chipper/issues/1029 is there a good reason for this rule?

  // Require generator functions to contain `yield`
  'require-yield': 'error',

  // Enforce sorted import declarations within modules
  'sort-imports': 'off', // Webstorm and ESLint sorting rules don't align

  // Require object keys to be sorted
  'sort-keys': 'off',

  // Require variables within the same declaration block to be sorted
  'sort-vars': 'off',

  // Enforce consistent spacing after the `//` or `/*` in a comment
  'spaced-comment': 'off',

  // Require or disallow strict mode directives
  strict: 'error',

  // Require symbol descriptions
  'symbol-description': 'error',

  // Require `var` declarations be placed at the top of their containing scope
  'vars-on-top': 'off',

  // Require or disallow "Yoda" conditions
  yoda: 'error',

  ////////////////////////////////////////////////////////////
  // These rules care about how the code looks rather than how it executes:
  // Layout & Formatting

  // Enforce linebreaks after opening and before closing array brackets
  'array-bracket-newline': 'off',

  // Enforce consistent spacing inside array brackets
  'array-bracket-spacing': [ 'error', 'always' ],

  // Enforce line breaks after each array element
  'array-element-newline': 'off',

  // Require parentheses around arrow function arguments
  'arrow-parens': [ 'error', 'as-needed' ],

  // Enforce consistent spacing before and after the arrow in arrow functions
  'arrow-spacing': 'error',

  // Disallow or enforce spaces inside of blocks after opening block and before closing block
  'block-spacing': 'off', // Our code style supports e.g.,: if ( !isFinite( newState.getTotalEnergy() ) ) { throw new Error( 'not finite' );}

  // Enforce consistent brace style for blocks
  'brace-style': [ 'error', 'stroustrup', { allowSingleLine: true } ],

  // Require or disallow trailing commas
  'comma-dangle': 'error', // see https://github.com/phetsims/tasks/issues/940

  // Enforce consistent spacing before and after commas
  'comma-spacing': [ 'error', { before: false, after: true } ],

  // Enforce consistent comma style
  'comma-style': [ 'error', 'last', { // good
    exceptions: {
      ArrayExpression: false,
      ArrayPattern: false,
      ArrowFunctionExpression: false,
      CallExpression: false,
      FunctionDeclaration: false,
      FunctionExpression: false,
      ImportDeclaration: false,
      ObjectExpression: false,
      ObjectPattern: false,
      VariableDeclaration: false,
      NewExpression: false
    }
  } ],

  // Enforce consistent spacing inside computed property brackets
  'computed-property-spacing': [ 'error', 'always' ],

  // Enforce consistent newlines before and after dots
  'dot-location': 'off', // We use WebStorm formatting which moves lower dots to the left

  // Require or disallow newline at the end of files
  // NOTE: This is off in the main config because it doesn't behave well with HTML files, see overrides for usage.
  'eol-last': 'off',

  // Require or disallow spacing between function identifiers and their invocations
  'func-call-spacing': [ 'error', 'never' ],

  // Enforce line breaks between arguments of a function call
  'function-call-argument-newline': [ 'off', 'consistent' ], // Not PhET's style

  // Enforce consistent line breaks inside function parentheses
  'function-paren-newline': 'off', // we often prefer parameters on the same line

  // Enforce consistent spacing around `*` operators in generator functions
  'generator-star-spacing': 'error',

  // Enforce the location of arrow function bodies
  'implicit-arrow-linebreak': 'off', // OK to line break in arrow functions if it improves readability.

  // Enforce consistent indentation
  indent: 'off',

  // Enforce the consistent use of either double or single quotes in JSX attributes
  'jsx-quotes': 'error',

  // Enforce consistent spacing between keys and values in object literal properties
  'key-spacing': [ 'error', { beforeColon: false, afterColon: true } ],

  // Enforce consistent spacing before and after keywords
  'keyword-spacing': [ 'error', {
    before: true,
    after: true,
    overrides: {
      case: { after: true }, // default
      switch: { after: false },
      catch: { after: false }
    }
  } ],

  // Enforce position of line comments
  'line-comment-position': 'off',

  // Enforce consistent linebreak style
  'linebreak-style': 'off', // Windows may check out a different line style than mac, so we cannot test this on local working copies cross-platform

  // Require empty lines around comments
  // SR Would like this rule enabled in his repos like so: 'lines-around-comment': [ 'error', { beforeLineComment: true } ]
  // JO really likes having the ability to have comments right under code.
  // MK understands both thoughts.
  // We will likely never turn this on fully, but feel free to add to your project!
  'lines-around-comment': 'off',

  // Require or disallow an empty line between class members
  'lines-between-class-members': [ 'error', 'always', { exceptAfterSingleLine: true } ],

  // Enforce a maximum line length
  'max-len': 'off', // Not a strict rule

  // Enforce a maximum number of statements allowed per line
  'max-statements-per-line': 'off', // 700+ occurrences in March 2021

  // Enforce newlines between operands of ternary expressions
  'multiline-ternary': 'off', // We use all styles of ternaries

  // Enforce or disallow parentheses when invoking a constructor with no arguments
  'new-parens': 'error',

  // Require a newline after each call in a method chain
  'newline-per-chained-call': 'off', // should be flexible

  // Disallow unnecessary parentheses
  'no-extra-parens': 'off', // we find that extraneous parentheses sometimes improve readability

  // Disallow mixed spaces and tabs for indentation
  'no-mixed-spaces-and-tabs': 'error',

  // Disallow multiple spaces
  'no-multi-spaces': [ 'error', { ignoreEOLComments: true } ],

  // Disallow multiple empty lines
  // DUPLICATION ALERT, this is overridden for html files, see above "overrides"
  'no-multiple-empty-lines': [ 'error', { max: 2, maxBOF: 0, maxEOF: 1 } ],

  // Disallow all tabs
  'no-tabs': 'error',

  // Disallow trailing whitespace at the end of lines
  'no-trailing-spaces': [ 'error', { skipBlankLines: true, ignoreComments: true } ],

  // Disallow whitespace before properties
  'no-whitespace-before-property': 'error',

  // Enforce the location of single-line statements
  'nonblock-statement-body-position': [ 'error', 'beside', { overrides: {} } ],

  // Enforce consistent line breaks after opening and before closing braces
  'object-curly-newline': 'error',

  // Enforce consistent spacing inside braces
  'object-curly-spacing': [ 'error', 'always' ],

  // Enforce placing object properties on separate lines
  'object-property-newline': 'off',

  // Enforce consistent linebreak style for operators
  'operator-linebreak': 'off',

  // Require or disallow padding within blocks
  'padded-blocks': 'off', // 109k fails

  // Require or disallow padding lines between statements
  'padding-line-between-statements': 'error',

  // Enforce the consistent use of either backticks, double, or single quotes
  quotes: [ 'error', 'single' ],

  // Enforce spacing between rest and spread operators and their expressions
  'rest-spread-spacing': 'error',

  // Require or disallow semicolons instead of ASI
  semi: [ 'error', 'always' ],

  // Enforce consistent spacing before and after semicolons
  'semi-spacing': [ 'error', { before: false, after: true } ],

  // Enforce location of semicolons
  'semi-style': [ 'error', 'last' ],

  // Enforce consistent spacing before blocks
  'space-before-blocks': 'error',

  // Enforce consistent spacing before `function` definition opening parenthesis
  'space-before-function-paren': [ 'error', {
    anonymous: 'never',
    named: 'never',
    asyncArrow: 'always'
  } ],

  // Enforce consistent spacing inside parentheses
  'space-in-parens': [ 'error', 'always' ],

  // Require spacing around infix operators
  'space-infix-ops': 'error',

  // Enforce consistent spacing before or after unary operators
  'space-unary-ops': [ 'error', {
    words: true,
    nonwords: false,
    overrides: {}
  } ],

  // Enforce spacing around colons of switch statements
  'switch-colon-spacing': [ 'error', { after: true, before: false } ],

  // Require or disallow spacing around embedded expressions of template strings
  'template-curly-spacing': 'error',

  // Require or disallow spacing between template tags and their literals
  'template-tag-spacing': [ 'error', 'never' ],

  // Require or disallow Unicode byte order mark (BOM)
  'unicode-bom': [ 'error', 'never' ],

  // Require parentheses around immediate `function` invocations
  'wrap-iife': 'off', // Not our style

  // Require parenthesis around regex literals
  'wrap-regex': 'off', // It already seems pretty ambiguous to me, but then again we only have 17 occurrences at the moment.

  // Require or disallow spacing around the `*` in `yield*` expressions
  'yield-star-spacing': 'error',

  // disallow space between function identifier and application
  'no-spaced-func': 'error',

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Custom Rules
  //

  'phet/bad-text': 'error',

  // Custom rule for checking the copyright.
  'phet/copyright': 'error',

  // Custom rule for checking TO-DOs have issues
  'phet/todo-should-have-issue': 'error',

  // Custom rule for ensuring that images and text use scenery node
  'phet/no-html-constructors': 'error',

  // Custom rule for avoiding instanceof Array.
  'phet/no-instanceof-array': 'error',

  // Custom rule for keeping import statements on a single line.
  'phet/single-line-import': 'error',

  // method declarations must have a visibility annotation
  'phet/visibility-annotation': 'error',

  // key and value arguments to namespace.register() must match
  'phet/namespace-match': 'error',

  // never allow object shorthand for properties, functions are ok.
  'phet/phet-object-shorthand': 'error',

  // a default import variable name should be the same as the filename
  'phet/default-import-match-filename': 'error',

  // When the default export of a file is a class, it should have a namespace register call
  'phet/default-export-class-should-register-namespace': 'error',

  // Importing the view from the model, uh oh. TODO: This is still in discussion, numerous repos opt out, see: https://github.com/phetsims/chipper/issues/1385
  'phet/no-view-imported-from-model': 'error',

  // Class names should match filename when exported.
  'phet/default-export-match-filename': 'error',

  // Use DerivedStringProperty for its PhET-iO benefits and consistency, see https://github.com/phetsims/phet-io/issues/1943
  'phet/prefer-derived-string-property': 'error',

  // A variable or attribute name should generally match the tandem name.
  'phet/tandem-name-should-match': 'error',

  // Each source file should list at least one author
  'phet/author-annotation': 'error',

  // Importing a relative path should have an extension
  'phet/import-statement-extension': 'error',

  // Importing should prefer *.js to *.ts etc.
  'phet/import-statement-extension-js': 'error'
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

};