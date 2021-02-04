#!/bin/sh
# From perennial
grunt build-decaf --project=$1
cd ../decaf
git add *
git commit -m "Update version"
git push
cd ../perennial
grunt deploy-decaf --project=$1 --dev --production