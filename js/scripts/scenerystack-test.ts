// Copyright 2024, University of Colorado Boulder

/**
 * Tests SceneryStack for the current SHAs.
 *
 * Creates checkouts/data under perennial/.scenerystack.
 *
 * 1. Use the scenerystack method of checking out and building scenerystack.
 * 2. Clone a bunch of demo/template repos, point them to the local scenerystack copy, and test them.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import fs from 'fs';
import execute from '../common/execute.js';
import winston from 'winston';
import { spawn } from 'child_process';
import npmUpdateDirectory from '../common/npmUpdateDirectory.js';
import puppeteerEvaluate from '../common/puppeteerEvaluate.js';
import withServer from '../common/withServer.js';
import puppeteerLoad from '../common/puppeteerLoad.js';

winston.default.transports.console.level = 'debug';

const SKIP_REFRESH = false;

const npxCommand = process.platform.startsWith( 'win' ) ? 'npx.cmd' : 'npx';

( async () => {
  fs.mkdirSync( './.scenerystack', { recursive: true } );

  const scenerystackRepos = [
    'demo-sim',
    'scenery-template-parcel',
    'scenery-template-vite',
    'sim-template-parcel',
    'sim-template-vite'
  ];

  if ( !SKIP_REFRESH ) {
    await execute( npxCommand, [ 'scenerystack', 'checkout' ], './.scenerystack' );

    // NOTE: Consider dependency sync, so that SHAs are identical to what we have checked out.
    // Not done here, since we won't have a scenerystack sha at the moment.

    await execute( npxCommand, [ 'scenerystack', 'build' ], './.scenerystack' );

    for ( const repo of scenerystackRepos ) {
      if ( !fs.existsSync( `./.scenerystack/${repo}` ) ) {
        console.log( `cloning ${repo}` );

        await execute( 'git', [ 'clone', `https://github.com/scenerystack/${repo}.git` ], './.scenerystack' );
      }

      // Patch it so that it refers to the local version of scenerystack
      const packageJSON = JSON.parse( fs.readFileSync( `./.scenerystack/${repo}/package.json`, 'utf8' ) );
      packageJSON.dependencies.scenerystack = 'file:../scenerystack';
      fs.writeFileSync( `./.scenerystack/${repo}/package.json`, JSON.stringify( packageJSON, null, 2 ) );

      // Patch vite configs so that they don't watch (fails on linux/sparky)
      if ( fs.existsSync( `./.scenerystack/${repo}/vite.config.js` ) ) {
        const viteConfig = fs.readFileSync( `./.scenerystack/${repo}/vite.config.js`, 'utf8' );
        if ( !viteConfig.includes( 'server: { watch: null }' ) ) {
          fs.writeFileSync( `./.scenerystack/${repo}/vite.config.js`, viteConfig.replace( 'base: "./",', 'base: "./", server: { watch: null }' ) );
        }
      }

      console.log( `npm update ${repo}` );
      await npmUpdateDirectory( `./.scenerystack/${repo}` );
    }
  }

  type ServeResult = {
    url: string;
    close: () => void;
  };

  const viteServe = ( cwd: string ): Promise<ServeResult> => {
    return new Promise<ServeResult>( ( resolve, reject ) => {
      const viteProcess = spawn( npxCommand, [ 'vite' ], { stdio: 'pipe', shell: true, cwd: cwd } );

      viteProcess.stdout.on( 'data', ( data: Buffer ) => {
        const output = data.toString();
        console.log( output );

        const urlMatch = output.match( /Local:\s+(.*)/ );

        if ( urlMatch ) {
          const url = urlMatch[ 1 ];

          viteProcess.stdout.removeAllListeners();

          console.log( `Vite serving at ${url}` );

          viteProcess.stdout.removeAllListeners();

          resolve( {
            url: url,
            close: () => {
              viteProcess.kill( 'SIGINT' );
            }
          } );
        }
      } );

      viteProcess.stderr.on( 'data', ( data: { toString(): string } ) => {
        console.error( `Error: ${data.toString()}` );
      } );

      viteProcess.on( 'close', ( code: number | null ) => {
        if ( code !== 0 ) {
          reject( new Error( `Vite process exited with code ${code}` ) );
        }
      } );
    } );
  };

  const parcelServe = ( cwd: string ): Promise<ServeResult> => {
    return new Promise<ServeResult>( ( resolve, reject ) => {
      const parcelProcess = spawn( npxCommand, [ 'parcel', 'index.html' ], { stdio: 'pipe', shell: true, cwd: cwd } );

      parcelProcess.stdout.on( 'data', ( data: Buffer ) => {
        const output = data.toString();
        console.log( output );

        const urlMatch = output.match( /Server running at\s+(.*)/ );

        if ( urlMatch ) {
          const url = urlMatch[ 1 ];

          parcelProcess.stdout.removeAllListeners();

          console.log( `Parcel serving at ${url}` );

          parcelProcess.stdout.removeAllListeners();

          resolve( {
            url: url,
            close: () => {
              parcelProcess.kill( 'SIGINT' );
            }
          } );
        }
      } );

      parcelProcess.stderr.on( 'data', ( data: { toString(): string } ) => {
        console.error( `Error: ${data.toString()}` );
      } );

      parcelProcess.on( 'close', ( code: number | null ) => {
        if ( code !== 0 ) {
          reject( new Error( `Parcel process exited with code ${code}` ) );
        }
      } );
    } );
  };

  const viteBuild = async ( cwd: string ) => {
    await execute( npxCommand, [ 'vite', 'build' ], cwd );
  };

  const parcelBuild = async ( cwd: string ) => {
    await execute( npxCommand, [ 'parcel', 'build', 'index.html', '--public-url', '.' ], cwd );
  };

  const errors: string[] = [];
  const onError = ( error: string ) => {
    errors.push( error );
    console.log( `error: ${error}` );
  };

  // tsc
  {
    for ( const repo of scenerystackRepos ) {
      console.log( `tsc ${repo}` );

      await execute( npxCommand, [ 'tsc' ], `./.scenerystack/${repo}` );
    }
  }

  // demo-sim vite serve
  {
    console.log( 'demo-sim vite serve' );

    const served = await viteServe( './.scenerystack/demo-sim' );

    console.log( 'launching puppeteer' );
    const hasDisplay = await puppeteerEvaluate( served.url, '!!phet.joist.sim.display' );

    if ( !hasDisplay ) {
      onError( 'demo-sim vite serve runtime failure' );
    }

    served.close();
  }

  // demo-sim vite build
  {
    console.log( 'demo-sim vite build' );

    await viteBuild( './.scenerystack/demo-sim' );

    const hasDisplay = await withServer( async port => {
      console.log( 'launching puppeteer' );
      return puppeteerEvaluate( `http://localhost:${port}/perennial/.scenerystack/demo-sim/dist/index.html`, '!!phet.joist.sim.display' );
    } );

    if ( !hasDisplay ) {
      onError( 'demo-sim vite build runtime failure' );
    }
  }

  for ( const repoPrefix of [ 'scenery-template-', 'sim-template-' ] ) {
    // Vite
    {
      const repo = `${repoPrefix}vite`;

      // serve
      {
        console.log( `vite serve ${repo}` );
        const served = await viteServe( `./.scenerystack/${repo}` );
        await puppeteerLoad( served.url );
        served.close();
      }

      // build
      {
        console.log( `vite build ${repo}` );
        await viteBuild( `./.scenerystack/${repo}` );
        await withServer( async port => {
          await puppeteerLoad( `http://localhost:${port}/perennial/.scenerystack/${repo}/dist/index.html` );
        } );
      }
    }

    // Parcel
    {
      const repo = `${repoPrefix}parcel`;

      // serve
      {
        console.log( `parcel serve ${repo}` );
        const served = await parcelServe( `./.scenerystack/${repo}` );
        console.log( 'served' );
        await puppeteerLoad( served.url );
        served.close();
      }

      // build
      {
        console.log( `parcel build ${repo}` );
        await parcelBuild( `./.scenerystack/${repo}` );
        console.log( 'built' );
        await withServer( async port => {
          await puppeteerLoad( `http://localhost:${port}/perennial/.scenerystack/${repo}/dist/index.html` );
        } );
      }
    }
  }

  if ( errors.length > 0 ) {
    console.log( 'errors', errors );

    process.exit( 1 );
  }
} )();