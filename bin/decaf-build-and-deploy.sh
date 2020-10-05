#!/bin/sh
# From perennial
grunt build-decaf --project=$1
cd ../decaf
git add projects/$1/package.json
git commit -m "update version"
git push
cd ../perennial
grunt deploy-decaf --project=$1 --dev --production