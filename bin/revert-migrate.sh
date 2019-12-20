#!/bin/bash

#=======================================================================================
#
# Resets the repos associated with the migrate feasibility prototype, see https://github.com/phetsims/chipper/issues/820
#
# Author: Sam Reid
#
#=======================================================================================

cd ../axon
git reset --hard

cd ../brand
git reset --hard

cd ../dot
git reset --hard

cd ../joist
git reset --hard

cd ../kite
git reset --hard

cd ../phetcommon
git reset --hard

cd ../phet-core
git reset --hard

cd ../phet-io
git reset --hard

cd ../example-sim
git reset --hard

cd ../scenery
git reset --hard

cd ../scenery-phet
git reset --hard

cd ../sun
git reset --hard

cd ../tambo
git reset --hard

cd ../tandem
git reset --hard

cd ../utterance-queue
git reset --hard

cd ../example-sim