# ESLint with PhET

## Overview

PhET uses [ESLint](https://eslint.org/) to statically analyze our code, solving several tasks:

- Find logical and syntax errors, e.g., misspelled variables.
- Ensure code conforms to PhET's style guideline, e.g., files must start with a copyright notice.
- Ensure code is formatted correctly, e.g., indentation is two spaces.
- Autofix as many of these issues as possible.

We use these tools at several stages of development:

- Automatically highlighting errors and formatting code in our IDEs as we code.
- Checking code during pre-commit hooks.
- Checking code during a build process.
- In continuous integration tests in [aqua](https://github.com/phetsims/aqua).

## Usage

For developers looking to ensure their changes pass ESLint, the typical entry point is to run `grunt lint`.
See `grunt lint --help` for options. If your code passes `grunt lint` (and other git hooks), then it is good to
merge.

## Shared Configuration Files

The directory (`./js/eslint/config`) contains most of the
[configuration for ESLint](https://eslint.org/docs/user-guide/configuring/). ESLint uses cascading configuration,
similar to CSS, so we can provide an inheritance tree of configuration settings.

Here is a list of all the available configuration files and why to use them for a repo:

- `root.eslint.config.mjs` is the base set of rules. You probably shouldn't use this directly, instead you should use one of the
  derived configurations below. Please note! Changing this file can also affect phet website repos. Please let that team
  know when changing.
- `node.eslint.config.mjs` expands on the base rules and adds configuration only intended for Node.js code (i.e. `perennial`).
- `sim.eslint.config.mjs` expands on the base rules and adds configuration intended for code run in sims (think of this as es5
  sim rules)

PhET also uses some custom linting rules to detect PhET-specific errors, such as ensuring that each file contains a
copyright notice. These custom rules live under the `./js/eslint/phet-rules/` directory.

## Configuring a repo

Each PhET repo specifies which of the above configurations to use. This is usually specified in the `eslint.config.mjs`. 
Search each repo's top-level eslint.config.mjs for examples.

Before creating a special configuration unique to one repo or sub-directory, answer these questions:

- Why does this rule apply here but not everywhere?
- May it apply in other places soon, and thus I should just add it to a configuration in `perennial/js/eslint/config`?
- Though it only applies here, is it easier to maintain if we just add it to a default configuration file?

## See Also

- For a discussion of how PhET decided to use ESLint for formatting, see
  https://github.com/phetsims/phet-info/issues/150

- IDE specific support is described in https://github.com/phetsims/phet-info/tree/main/ide
