// Copyright 2015-2021, University of Colorado Boulder

/**
 * Typescript-ESLint rules for our TypeScript codebase.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default {

  // TypeScript ESLint Rules.  Legend
  // ✅ - recommended
  // 🔒 - strict
  // 🔧 - fixable
  // 🛠 - has-suggestions
  // 💭 - requires type information

  ////////////////////////////////////////////////////////////////////////
  // Supported Rules

  // Require that member overloads be consecutive ✅
  '@typescript-eslint/adjacent-overload-signatures': 'error',

  // Require using either T[] or Array<T> for arrays 🔒 🔧
  '@typescript-eslint/array-type': 'off', // We agreed this should be developer preference

  // Disallow awaiting a value that is not a Thenable ✅  💭
  '@typescript-eslint/await-thenable': 'error',

  // Disallow @ts-<directive> comments or require descriptions after directive ✅
  // A value of true for a particular directive means that this rule will report if it finds any usage of said directive.
  // See banTSCommentConfig.mjs for a reusable strict configuration.
  '@typescript-eslint/ban-ts-comment': [ 'error', {
    'ts-ignore': false, // Covered by '@typescript-eslint/prefer-ts-expect-error'
    'ts-check': true,
    'ts-expect-error': false, // TODO: Chip way as dev team https://github.com/phetsims/chipper/issues/1277
    'ts-nocheck': false // TODO: Chip way as dev team https://github.com/phetsims/chipper/issues/1277
  } ],

  // Disallow // tslint:<rule-flag> comments 🔒 🔧
  '@typescript-eslint/ban-tslint-comment': 'error',

  // Disallow certain types ✅ 🔧
  '@typescript-eslint/no-restricted-types': [
    'error',
    {
      types: {
        Omit: {
          message: 'Prefer StrictOmit for type safety',
          fixWith: 'StrictOmit'
        },

        // Defaults copied from http://condensed.physics.usyd.edu.au/frontend/node_modules/@typescript-eslint/eslint-plugin/docs/rules/ban-types.md
        String: {
          message: 'Use string instead',
          fixWith: 'string'
        },
        Boolean: {
          message: 'Use boolean instead',
          fixWith: 'boolean'
        },
        Number: {
          message: 'Use number instead',
          fixWith: 'number'
        },
        Symbol: {
          message: 'Use symbol instead',
          fixWith: 'symbol'
        },
        BigInt: {
          message: 'Use bigint instead',
          fixWith: 'bigint'
        },
        Function: {
          message: [
            'The `Function` type accepts any function-like value.',
            'It provides no type safety when calling the function, which can be a common source of bugs.',
            'It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`.',
            'If you are expecting the function to accept certain arguments, you should explicitly define the function shape.'
          ].join( '\n' )
        },
        // object typing
        Object: {
          message: [
            'The `Object` type actually means "any non-nullish value", so it is marginally better than `unknown`.',
            '- If you want a type meaning "any object", you probably want `object` instead.',
            '- If you want a type meaning "any value", you probably want `unknown` instead.',
            '- If you really want a type meaning "any non-nullish value", you probably want `NonNullable<unknown>` instead.'
          ].join( '\n' ),
          suggest: [ 'object', 'unknown', 'NonNullable<unknown>' ]
        },
        '{}': {
          message: [
            '`{}` actually means "any non-nullish value".',
            '- If you want a type meaning "any object", you probably want `object` instead.',
            '- If you want a type meaning "any value", you probably want `unknown` instead.',
            '- If you want a type meaning "empty object", you probably want `Record<string, never>` instead.',
            '- If you really want a type meaning "any non-nullish value", you probably want `NonNullable<unknown>` instead.'
          ].join( '\n' ),
          suggest: [
            'object',
            'unknown',
            'Record<string, never>',
            'NonNullable<unknown>'
          ]
        }
      }
    }
  ],

  // Enforce that literals on classes are exposed in a consistent style 🔒 🔧
  '@typescript-eslint/class-literal-property-style': 'off', // This rule is not compatible with our mixin strategy, see https://github.com/phetsims/chipper/issues/1279

  // Enforce specifying generic type arguments on type annotation or constructor name of a constructor call 🔒 🔧
  '@typescript-eslint/consistent-generic-constructors': 'error', // It seems preferable to specify the type parameters at the `new` instantiation site

  // Require or disallow the Record type 🔒 🔧
  '@typescript-eslint/consistent-indexed-object-style': 'error',

  // Enforce consistent usage of type assertions 🔒
  '@typescript-eslint/consistent-type-assertions': 'error',

  // Enforce type definitions to consistently use either interface or type 🔒 🔧
  '@typescript-eslint/consistent-type-definitions': [ 'error', 'type' ], // We prefer using Type-Alias

  // Enforce consistent usage of type exports  🔧 💭
  '@typescript-eslint/consistent-type-exports': 'off', // We did not observe a performance boost, nor do we see a significant benefit from this rule. See https://github.com/phetsims/chipper/issues/1283

  // Enforce consistent usage of type imports  🔧
  // This rule can be helpful with --fix for cleaning up circular dependencies, but since webstorm doesn't have an easy
  // way of importing as just a type, we will leave this off. See https://github.com/phetsims/perennial/issues/432
  // NOTE: To fix many circular dependencies from type imports, use --fix with this error setting: [ 'error', { fixStyle: 'inline-type-imports' } ]
  // We did not observe a performance boost with this rule on in https://github.com/phetsims/chipper/issues/1283
  '@typescript-eslint/consistent-type-imports': 'off',

  // Require explicit return types on functions and class methods
  '@typescript-eslint/explicit-function-return-type': 'off', // We want to use inference on local arrow functions. We use explicit-method-return-type for the important cases.

  // Require explicit accessibility modifiers on class properties and methods  🔧
  '@typescript-eslint/explicit-member-accessibility': 'error',

  // Require explicit return and argument types on exported functions' and classes' public class methods
  '@typescript-eslint/explicit-module-boundary-types': 'error',

  // Require a specific member delimiter style for interfaces and type literals  🔧
  '@stylistic/member-delimiter-style': 'error', // semi colons in type declarations.

  // Require a consistent member declaration order
  '@typescript-eslint/member-ordering': 'off', // We agreed to leave this rule off because it is more important to sort semantically than alphabetically

  // Enforce using a particular method signature syntax  🔧
  '@typescript-eslint/method-signature-style': 'off', // We agreed to leave this as developer preference.  Some developers prefer to use method style in interfaces and property style in types, but the rule doesn't support that option.

  // Enforce naming conventions for everything across a codebase   💭
  '@typescript-eslint/naming-convention': 'off', // TODO: We should decide on the conventions and enable this rule. https://github.com/phetsims/chipper/issues/1277

  // Require .toString() to only be called on objects which provide useful information when stringified 🔒  💭
  '@typescript-eslint/no-base-to-string': 'error',

  // Disallow non-null assertion in locations that may be confusing 🔒 🔧 🛠
  '@typescript-eslint/no-confusing-non-null-assertion': 'error',

  // Require expressions of type void to appear in statement position  🔧 🛠 💭
  '@typescript-eslint/no-confusing-void-expression': 'off', // It transforms `() => this.update()` to `() => { this.update(); }`, so is it really desirable?  Errors in 200 files

  // Disallow duplicate enum member values 🔒 🛠
  '@typescript-eslint/no-duplicate-enum-values': 'error',

  // Disallow using the delete operator on computed key expressions 🔒 🔧
  '@typescript-eslint/no-dynamic-delete': 'off', // TODO: Code should use Map or Set instead.  22 failures at the moment.  We would like to enable this rule. https://github.com/phetsims/chipper/issues/1277

  // Disallow the declaration of empty interfaces ✅ 🔧 🛠
  '@typescript-eslint/no-empty-interface': 'error',

  // Disallow the any type ✅ 🔧 🛠
  '@typescript-eslint/no-explicit-any': 'error',

  // Disallow extra non-null assertion ✅ 🔧
  '@typescript-eslint/no-extra-non-null-assertion': 'error',

  // Disallow classes used as namespaces 🔒
  '@typescript-eslint/no-extraneous-class': 'off', // It is sometimes useful to have a class with static methods that can call each other

  // Require Promise-like statements to be handled appropriately ✅ 🛠 💭
  '@typescript-eslint/no-floating-promises': 'error',

  // Disallow iterating over an array with a for-in loop ✅  💭
  '@typescript-eslint/no-for-in-array': 'error',

  // Disallow usage of the implicit any type in catch clauses  🔧 🛠
  '@typescript-eslint/no-implicit-any-catch': 'off', // Deprecated rule

  // Disallow explicit type declarations for variables or parameters initialized to a number, string, or boolean ✅ 🔧
  '@typescript-eslint/no-inferrable-types': 'error',

  // Disallow void type outside of generic or return types 🔒
  '@typescript-eslint/no-invalid-void-type': 'error',

  // Disallow the void operator except when used to discard a value 🔒 🔧 🛠 💭
  '@typescript-eslint/no-meaningless-void-operator': 'error',

  // Enforce valid definition of new and constructor ✅
  '@typescript-eslint/no-misused-new': 'error',

  // Disallow Promises in places not designed to handle them ✅  💭
  '@typescript-eslint/no-misused-promises': 'off', // TODO: Discuss this rule.  6 failures https://github.com/phetsims/chipper/issues/1277

  // Disallow custom TypeScript modules and namespaces ✅
  '@typescript-eslint/no-namespace': 'error',

  // Disallow non-null assertions in the left operand of a nullish coalescing operator 🔒 🛠
  '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',

  // Disallow non-null assertions after an optional chain expression ✅ 🛠
  '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',

  // Disallow non-null assertions using the ! postfix operator ✅ 🛠
  '@typescript-eslint/no-non-null-assertion': 'off', // We do not support this rule, see https://github.com/phetsims/chipper/issues/1114#issuecomment-1099536133

  // Disallow the use of parameter properties in class constructors
  '@typescript-eslint/no-parameter-properties': 'off', // This rule is deprecated.

  // Disallow members of unions and intersections that do nothing or override type information   💭
  '@typescript-eslint/no-redundant-type-constituents': 'off',

  // Disallow invocation of require()
  '@typescript-eslint/no-require-imports': 'error',

  // Disallow aliasing this ✅
  '@typescript-eslint/no-this-alias': 'error',

  // Disallow type aliases
  '@typescript-eslint/no-type-alias': 'off', // We use type-alias frequently and prefer them over interfaces

  // Disallow unnecessary equality comparisons against boolean literals 🔒 🔧 💭
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',

  // Disallow conditionals where the type is always truthy or always falsy 🔒 🔧 💭
  '@typescript-eslint/no-unnecessary-condition': 'off', // TODO: Would be nice to enable but 500 problems may prevent us https://github.com/phetsims/chipper/issues/1277

  // Disallow unnecessary namespace qualifiers  🔧 💭
  '@typescript-eslint/no-unnecessary-qualifier': 'off', // TODO: Enable this rule https://github.com/phetsims/chipper/issues/1277

  // Disallow type arguments that are equal to the default 🔒 🔧 💭
  '@typescript-eslint/no-unnecessary-type-arguments': 'error',

  // Disallow type assertions that do not change the type of an expression ✅ 🔧 💭
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',

  // Disallow unnecessary constraints on generic types ✅ 🛠
  '@typescript-eslint/no-unnecessary-type-constraint': 'error',

  // Disallow calling a function with a value with type any ✅  💭
  '@typescript-eslint/no-unsafe-argument': 'off', // TODO: We should enable this rule, but it may be tricky since some of the any come from JS files. 412 failures https://github.com/phetsims/chipper/issues/1277

  // Disallow assigning a value with type any to variables and properties ✅  💭
  '@typescript-eslint/no-unsafe-assignment': 'off', // TODO: Enable this rule since it will help us avoid any.  547 problems, will need to chip-away https://github.com/phetsims/chipper/issues/1277

  // Disallow calling a value with type any ✅  💭
  '@typescript-eslint/no-unsafe-call': 'off', // TODO: Enable this rule since it will help us avoid any https://github.com/phetsims/chipper/issues/1277

  // Disallow member access on a value with type any ✅  💭
  '@typescript-eslint/no-unsafe-member-access': 'off', // TODO: Enable this rule since it will help us avoid any https://github.com/phetsims/chipper/issues/1277

  // Disallow returning a value with type any from a function ✅  💭
  '@typescript-eslint/no-unsafe-return': 'off', // TODO: Enable this rule since it will help us avoid any https://github.com/phetsims/chipper/issues/1277

  // Disallow empty exports that don't change anything in a module file  🔧 🛠
  '@typescript-eslint/no-useless-empty-export': 'error',

  // Disallow require statements except in import statements ✅
  '@typescript-eslint/no-var-requires': 'error',

  // Enforce non-null assertions over explicit type casts 🔒 🔧 💭
  '@typescript-eslint/non-nullable-type-assertion-style': 'error',

  // Require or disallow parameter properties in class constructors
  '@typescript-eslint/parameter-properties': 'off', // TODO: Let's discuss as a team. 16 failures.  Discuss parameter properties to discuss with the team.  Write up results in the typescript-conventions doc https://github.com/phetsims/chipper/issues/1277

  // Enforce the use of as const over literal type ✅ 🔧 🛠
  '@typescript-eslint/prefer-as-const': 'error',

  // Require each enum member value to be explicitly initialized  🛠
  '@typescript-eslint/prefer-enum-initializers': 'error',

  // Enforce the use of for-of loop over the standard for loop where possible 🔒
  '@typescript-eslint/prefer-for-of': 'off', // TODO: We agreed to enable this rule.  It will require chip-away since it has no autofix.  289 failures. https://github.com/phetsims/chipper/issues/1277

  // Enforce using function types instead of interfaces with call signatures 🔒 🔧
  '@typescript-eslint/prefer-function-type': 'off', // TODO: We agreed to enable this rule.  4 failures can be autofixed. https://github.com/phetsims/chipper/issues/1277

  // Enforce includes method over indexOf method 🔒 🔧 💭
  '@typescript-eslint/prefer-includes': 'error',

  // Require all enum members to be literal values 🔒
  '@typescript-eslint/prefer-literal-enum-member': 'error',

  // Require using namespace keyword over module keyword to declare custom TypeScript modules ✅ 🔧
  '@typescript-eslint/prefer-namespace-keyword': 'error',

  // Enforce using the nullish coalescing operator instead of logical chaining 🔒 🛠 💭
  '@typescript-eslint/prefer-nullish-coalescing': 'off', // TODO: Enable rule https://github.com/phetsims/chipper/issues/1277

  // Enforce using concise optional chain expressions instead of chained logical ands 🔒 🛠
  '@typescript-eslint/prefer-optional-chain': 'off', // TODO: We would like to discuss as a team.  It seems easier to read and write, so we would like to pursue it. 3227 failures.  Many cases may be assertions.  But some developers may want to use && in some cases. https://github.com/phetsims/chipper/issues/1277

  // Require private members to be marked as readonly if they're never modified outside of the constructor  🔧 💭
  '@typescript-eslint/prefer-readonly': 'off',

  // Require function parameters to be typed as readonly to prevent accidental mutation of inputs   💭
  '@typescript-eslint/prefer-readonly-parameter-types': 'off',

  // Enforce using type parameter when calling Array#reduce instead of casting 🔒 🔧 💭
  '@typescript-eslint/prefer-reduce-type-parameter': 'off', // TODO: Enable this rule https://github.com/phetsims/chipper/issues/1277

  // Enforce RegExp#exec over String#match if no global flag is provided  🔧 💭
  '@typescript-eslint/prefer-regexp-exec': 'off',

  // Enforce that this is used when only this type is returned 🔒 🔧 💭
  '@typescript-eslint/prefer-return-this-type': 'off',

  // Enforce using String#startsWith and String#endsWith over other equivalent methods of checking substrings 🔒 🔧 💭
  '@typescript-eslint/prefer-string-starts-ends-with': 'error',

  // Enforce using @ts-expect-error over @ts-ignore 🔒 🔧
  '@typescript-eslint/prefer-ts-expect-error': 'error',

  // Require any function or method that returns a Promise to be marked async  🔧 💭
  '@typescript-eslint/promise-function-async': 'off',

  // Require Array#sort calls to always provide a compareFunction   💭
  '@typescript-eslint/require-array-sort-compare': 'off',

  // Require both operands of addition to have type number or string ✅  💭
  '@typescript-eslint/restrict-plus-operands': 'off',

  // Enforce template literal expressions to be of string type ✅  💭
  '@typescript-eslint/restrict-template-expressions': 'off',

  // Enforce members of a type union/intersection to be sorted alphabetically  🔧 🛠
  '@typescript-eslint/sort-type-union-intersection-members': 'off', // We agreed to sort things semantically rather than alphabetically

  // Disallow certain types in boolean expressions  🔧 🛠 💭
  '@typescript-eslint/strict-boolean-expressions': 'off', // TODO: Is this a good rule for our team? https://github.com/phetsims/chipper/issues/1277

  // Require switch-case statements to be exhaustive with union type  🛠 💭
  '@typescript-eslint/switch-exhaustiveness-check': 'off', // TODO: Enable rule https://github.com/phetsims/chipper/issues/1277

  // Disallow certain triple slash directives in favor of ES6-style import declarations ✅
  '@typescript-eslint/triple-slash-reference': 'error',

  // Require consistent spacing around type annotations  🔧
  '@typescript-eslint/type-annotation-spacing': 'off', // TODO: Investigate.  7 failures https://github.com/phetsims/chipper/issues/1277

  // Require type annotations in certain places
  '@typescript-eslint/typedef': 'error',

  // Enforce unbound methods are called with their expected scope ✅  💭
  '@typescript-eslint/unbound-method': 'off',

  // Disallow two overloads that could be unified into one with a union or an optional/rest parameter 🔒
  '@typescript-eslint/unified-signatures': 'off', // TODO: Investigate. Probably enable. 6 failures https://github.com/phetsims/chipper/issues/1277

  ////////////////////////////////////////////////////////////////////////
  // Extension Rules
  // In some cases, ESLint provides a rule itself, but it doesn't support TypeScript syntax; either it crashes, or
  // it ignores the syntax, or it falsely reports against it. In these cases, we create what we call an extension
  // rule; a rule within our plugin that has the same functionality, but also supports TypeScript.
  // You must disable the base rule to avoid duplicate/incorrect errors for an extension rule.

  // Enforce consistent brace style for blocks  🔧
  '@stylistic/brace-style': [ 'error', 'stroustrup', { allowSingleLine: true } ],

  // Require or disallow trailing commas  🔧
  '@stylistic/comma-dangle': 'error',

  // Enforce consistent spacing before and after commas  🔧
  '@stylistic/comma-spacing': 'error',

  // Enforce default parameters to be last
  'default-param-last': 'off',
  '@typescript-eslint/default-param-last': 'error',

  // Enforce dot notation whenever possible 🔒 🔧 💭
  'dot-notation': 'off',
  '@typescript-eslint/dot-notation': 'error',

  // Require or disallow spacing between function identifiers and their invocations  🔧
  '@stylistic/func-call-spacing': 'error',

  // Enforce consistent indentation  🔧
  indent: 'off',
  '@typescript-eslint/indent': 'off', // This rule has 151023 failures, perhaps it is incompatible with our formatting

  // Require or disallow initialization in variable declarations
  'init-declarations': 'off',
  '@typescript-eslint/init-declarations': 'off', // 237 Failures

  // Enforce consistent spacing before and after keywords  🔧
  '@stylistic/keyword-spacing': [ 'error', { // TODO: Check this rule https://github.com/phetsims/chipper/issues/1277
    before: true,
    after: true,
    overrides: {
      case: { after: true }, // default
      switch: { after: false },
      catch: { after: false }
    }
  } ],

  // Require or disallow an empty line between class members  🔧
  'lines-between-class-members': 'off',
  '@typescript-eslint/lines-between-class-members': 'off', // Probably leave this off, it has 2775 failures

  // Disallow generic Array constructors ✅ 🔧
  'no-array-constructor': 'off',
  '@typescript-eslint/no-array-constructor': 'error',

  // Disallow duplicate class members
  'no-dupe-class-members': 'off',
  '@typescript-eslint/no-dupe-class-members': 'error',

  // Disallow duplicate imports
  'no-duplicate-imports': 'off',
  '@typescript-eslint/no-duplicate-imports': 'off', // TODO: Deprecated. Investigate this instead https://github.com/import-js/eslint-plugin-import/blob/HEAD/docs/rules/no-duplicates.md https://github.com/phetsims/chipper/issues/1277

  // Disallow empty functions ✅
  'no-empty-function': 'off',
  '@typescript-eslint/no-empty-function': 'error',

  // Disallow unnecessary parentheses  🔧
  'no-extra-parens': 'off',
  '@typescript-eslint/no-extra-parens': 'off', // we find that extraneous parentheses sometimes improve readability

  // Disallow unnecessary semicolons ✅ 🔧
  '@stylistic/no-extra-semi': 'error',

  // Disallow the use of eval()-like methods ✅  💭
  'no-implied-eval': 'off',
  '@typescript-eslint/no-implied-eval': 'off',

  // Disallow this keywords outside of classes or class-like objects
  'no-invalid-this': 'off',
  '@typescript-eslint/no-invalid-this': 'error',

  // Disallow function declarations that contain unsafe references inside loop statements
  'no-loop-func': 'off',
  '@typescript-eslint/no-loop-func': 'error',

  // Disallow literal numbers that lose precision ✅
  'no-loss-of-precision': 'off',
  '@typescript-eslint/no-loss-of-precision': 'error',

  // Disallow magic numbers
  'no-magic-numbers': 'off',
  '@typescript-eslint/no-magic-numbers': 'off', // We have many magic numbers

  // Disallow variable redeclaration
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',

  // Disallow specified modules when loaded by import
  'no-restricted-imports': 'off',
  '@typescript-eslint/no-restricted-imports': 'error',

  // Disallow variable declarations from shadowing variables declared in the outer scope
  'no-shadow': 'off',
  '@typescript-eslint/no-shadow': 'off', // Disabled for the same reason as in the JS Code. 173 failures

  // Disallow throwing literals as exceptions 🔒  💭
  'no-throw-literal': 'off',
  '@typescript-eslint/no-throw-literal': 'off', // TODO: Enable rule https://github.com/phetsims/chipper/issues/1277

  // Disallow unused expressions
  'no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-expressions': 'off', // See notes below

  // Disallow unused variables ✅
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': [ 'error', {

    // We don't want to turn this on because of the example in https://github.com/phetsims/chipper/issues/1230#issuecomment-1185843199
    vars: 'all',
    args: 'none',
    caughtErrors: 'none'
  } ],

  // Disallow the use of variables before they are defined
  'no-use-before-define': 'off',
  '@typescript-eslint/no-use-before-define': 'off', // We often declare auxiliary classes at the bottom of a file, which are used in the primary class

  // Disallow unnecessary constructors 🔒
  'no-useless-constructor': 'off',
  '@typescript-eslint/no-useless-constructor': 'off', // We determined the useless constructors are good for documentation and clarity.

  // Enforce consistent spacing inside braces  🔧
  '@stylistic/object-curly-spacing': [ 'error', 'always' ],

  // Require or disallow padding lines between statements  🔧 🛠
  '@stylistic/padding-line-between-statements': 'error',

  // Enforce the consistent use of either backticks, double, or single quotes  🔧
  '@stylistic/quotes': [ 'error', 'single' ],

  // Disallow async functions which have no await expression ✅  💭
  'require-await': 'off',
  '@typescript-eslint/require-await': 'off',

  // Enforce consistent returning of awaited values  🔧 🛠 💭
  'return-await': 'off',
  '@typescript-eslint/return-await': 'off', // TODO: Enable rule https://github.com/phetsims/chipper/issues/1277

  // Require or disallow semicolons instead of ASI  🔧
  '@stylistic/semi': [ 'error', 'always' ],

  // Enforce consistent spacing before blocks  🔧
  '@stylistic/space-before-blocks': 'error',

  // Enforce consistent spacing before function parenthesis  🔧
  '@stylistic/space-before-function-paren': [ 'error', {
    anonymous: 'never',
    named: 'never',
    asyncArrow: 'always'
  } ],

  // Require spacing around infix operators  🔧
  '@stylistic/space-infix-ops': 'error',

  ////////////////////////////////////////////////////////////////////////
  // Custom TypeScript Rules
  'phet/bad-typescript-text': 'error',

  'phet/no-simple-type-checking-assertions': 'error',

  // Custom return type rule that only requires for methods. The includes return type was too overarching.
  'phet/explicit-method-return-type': 'error',

  // Variables that are Properties should end in "Property", like const myProperty = new Property();
  'phet/require-property-suffix': 'error',

  // Documentation should come before imports, see https://github.com/phetsims/perennial/issues/447
  'phet/documentation-before-imports': 'error',

  // Static fields should have the 'readonly' modifier
  'phet/uppercase-statics-should-be-readonly': 'error',

  // Prevent spread operator on non-literals because it does not do excess property detection. In general, this rule
  // helps catch potential errors, and mistakes with PhET's option pattern, but please feel free to disable this rule
  // in cases where you feel confident, and strongly don't want the type safety of excess property checking.
  'phet/no-object-spread-on-non-literals': 'error',

  // Often we mistakenly Pick<PhetioObject,'tandem'> but it should be picked from PhetioObjectOptions
  'phet/phet-io-object-options-should-not-pick-from-phet-io-object': 'error'
};