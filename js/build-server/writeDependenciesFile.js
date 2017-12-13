// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const fs = require( 'fs.extra' ); // eslint-disable-line

/**
 * Write a dependencies.json file based on the the dependencies passed to the build server.
 * The reason to write this to a file instead of using the in memory values, is so the "grunt checkout-shas"
 * task works without much modification.
 */
module.exports = function writeDependenciesFile() {

};