// Copyright 2019, University of Colorado Boulder

/**
 * To be used when trying to import lodash from other repos. This way we don't propagate the devDependency: "@types/lodash"
 * @author Michael Kauzmann (PhET Interactive Simulations)
 *
 * TODO: SR: Let's probably just use the sherpa one, and delete this one.
 * TODO: MK: Why? Seems best to use npm modules in Nodejs code in chipper/perennial, and keep perennial dependency-less, see https://github.com/phetsims/chipper/issues/1523
 */

import lodash from 'lodash';

export default lodash;