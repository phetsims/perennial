// Copyright 2025, University of Colorado Boulder

/**
 * Grunt task that runs an automated accessibility audit against a running sim.
 * The task launches Playwright Chromium, opens the sim URL, and executes Axe (axe-core)
 * to detect accessibility violations. Results are filtered by impact threshold and any
 * locally suppressed rules, then printed to stdout with a non-zero exit code on violations.
 *
 * Usage examples:
 *   grunt test-a11y-audit --port=8080 (run from the simulation directory)
 *   grunt test-a11y-audit --repo=membrane-transport --port=8080 --impact=serious
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import AxeBuilder from '@axe-core/playwright';
import playwright from '../../npm-dependencies/playwright.js';
import { getOptionIfProvided } from './util/getOption.js';
import getRepo from './util/getRepo.js';

// Base host used to build the target sim URL.
const DEFAULT_HOST = 'http://localhost';

// Default dev server port used when no --port is supplied.
const DEFAULT_PORT = 8080;

// Brand query parameter for the sim under test.
const DEFAULT_BRAND = 'phet';

// Axe impact levels, sourced from axe-core's violation impact taxonomy.
// See https://github.com/dequelabs/axe-core/blob/develop/doc/issue_impact.md
const AXE_IMPACT_VALUES = [ 'minor', 'moderate', 'serious', 'critical' ] as const;
type AxeImpact = typeof AXE_IMPACT_VALUES[ number ];

// Ordered impact levels from lowest to highest severity for filtering.
const AXE_IMPACT_PRIORITY: AxeImpact[] = [ ...AXE_IMPACT_VALUES ];

// Default query flags appended to the sim URL for the a11y audit.
// postMessageOnLoad lets us wait for an explicit "load" signal from the sim.
const DEFAULT_QUERY_FLAGS = [ 'ea', 'postMessageOnLoad', 'fuzz', 'supportsVoicing=false' ] as const;

// Default test duration in ms for repeated Axe sampling.
const DEFAULT_TEST_DURATION_MS = 10000;

// Default delay between test samples in ms. This is a minimum value and the interval may take
// longer if axe tests take longer.
const DEFAULT_TEST_INTERVAL_MS = 500;

// Minimum impact level reported when no --impact is supplied.
const DEFAULT_MIN_IMPACT: AxeImpact = 'minor';

// Axe rule IDs suppressed from reporting.
const SUPPRESSED_VIOLATION_IDS = new Set( [ 'meta-viewport', 'region' ] );

// Sim name derived from --repo or the current working directory.
const sim = getRepo();

/**
 * Builds the sim URL that will be opened by Playwright, respecting CLI overrides (host, repo, port).
 */
function buildTargetUrl(): string {
  const host = getOptionIfProvided( 'host', DEFAULT_HOST );
  let baseUrl: URL;
  try {
    baseUrl = new URL( host );
  }
  catch( err ) {
    throw new Error( `Invalid host "${host}". Expected a fully qualified URL like "http://localhost".` );
  }
  if ( baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:' ) {
    throw new Error( `Invalid host "${host}". Expected http or https.` );
  }
  const port = Number( getOptionIfProvided( 'port', DEFAULT_PORT ) );
  if ( !Number.isFinite( port ) || port <= 0 ) {
    throw new Error( `Invalid port "${port}"` );
  }

  const queryParts: string[] = [
    `brand=${encodeURIComponent( DEFAULT_BRAND )}`,
    ...DEFAULT_QUERY_FLAGS
  ];

  return `${baseUrl.origin}:${port}/${sim}/${sim}_en.html?${queryParts.join( '&' )}`;
}

/**
 * Resolves the minimum violation severity based on CLI input so downstream filtering can reference one value.
 */
function getMinimumImpact(): AxeImpact {
  const impactOption = getOptionIfProvided<string>( 'impact', DEFAULT_MIN_IMPACT );
  const normalized = typeof impactOption === 'string' ? impactOption.toLowerCase() : DEFAULT_MIN_IMPACT;
  if ( AXE_IMPACT_PRIORITY.includes( normalized as AxeImpact ) ) {
    return normalized as AxeImpact;
  }
  console.warn( `[test-a11y-audit] Unsupported impact "${impactOption}", defaulting to "${DEFAULT_MIN_IMPACT}"` );
  return DEFAULT_MIN_IMPACT;
}

/**
 * Reads fuzz options from CLI flags with sensible defaults and validation so
 * automated runs can tune sampling consistently.
 */
function getFuzzOptions(): { durationMs: number; intervalMs: number } {
  const durationOption = Number( getOptionIfProvided( 'testDuration', DEFAULT_TEST_DURATION_MS ) );
  const intervalOption = Number( getOptionIfProvided( 'testInterval', DEFAULT_TEST_INTERVAL_MS ) );

  const durationMs = Number.isFinite( durationOption ) && durationOption > 0 ? durationOption : DEFAULT_TEST_DURATION_MS;
  const intervalMs = Number.isFinite( intervalOption ) && intervalOption > 0 ? intervalOption : DEFAULT_TEST_INTERVAL_MS;

  if ( durationMs !== durationOption ) {
    console.warn( `[test-a11y-audit] Invalid testDuration "${durationOption}", defaulting to "${DEFAULT_TEST_DURATION_MS}"` );
  }
  if ( intervalMs !== intervalOption ) {
    console.warn( `[test-a11y-audit] Invalid testInterval "${intervalOption}", defaulting to "${DEFAULT_TEST_INTERVAL_MS}"` );
  }

  return {
    durationMs: durationMs,
    intervalMs: intervalMs
  };
}

/**
 * Determines whether an Axe violation should be reported, using the impact threshold resolved earlier.
 */
function includeViolation( impact: unknown, minimumImpact: AxeImpact ): boolean {
  if ( typeof impact !== 'string' ) {
    return true;
  }
  const normalized = impact.toLowerCase() as AxeImpact;
  const violationIndex = AXE_IMPACT_PRIORITY.indexOf( normalized );
  if ( violationIndex === -1 ) {
    return true;
  }
  const minimumIndex = AXE_IMPACT_PRIORITY.indexOf( minimumImpact );
  return violationIndex >= minimumIndex;
}

/**
 * Launches Playwright, runs Axe on the requested URL, filters/suppresses violations, and sets CI exit codes.
 */
async function runAxeDevTests(): Promise<void> {
  const browser = await playwright.chromium.launch();

  try {

    // axe-core/playwright wants a page that comes from a BrowserContext
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject a page-context listener that flips a flag when the sim posts its load event.
    // This avoids running Axe until the sim has explicitly signaled readiness.
    await page.addInitScript( {
      content: `
        window.__phetSimulationLoadComplete = false;
        window.addEventListener( 'message', event => {
          if ( typeof event.data !== 'string' ) {
            return;
          }
          try {
            const data = JSON.parse( event.data );
            if ( data && data.type === 'load' ) {
              window.__phetSimulationLoadComplete = true;
            }
          }
          catch( err ) {
            // Ignore messages that are not JSON payloads from the sim.
          }
        } );
      `
    } );

    const url = buildTargetUrl();
    console.log( `[test-a11y-audit] Launching ${url}` );
    await page.goto( url, {
      waitUntil: 'networkidle'
    } );

    // Wait for the sim's postMessage load signal so Axe runs after the app is fully initialized.
    await page.waitForFunction( 'window.__phetSimulationLoadComplete === true', undefined, { timeout: 10000 } );

    const minimumImpact = getMinimumImpact();
    const { durationMs, intervalMs } = getFuzzOptions();
    const testStartTimeMs = Date.now();

    while ( Date.now() - testStartTimeMs < durationMs ) {
      const sampleStartTimeMs = Date.now();

      const results = await new AxeBuilder( { page: page } ).analyze();
      const filteredViolations = results.violations.filter( violation => {
        if ( SUPPRESSED_VIOLATION_IDS.has( violation.id ) ) {
          return false;
        }
        return includeViolation( violation.impact, minimumImpact );
      } );

      if ( filteredViolations.length > 0 ) {
        console.log( 'Violations:', JSON.stringify( filteredViolations, null, 2 ) );

        // Non-zero exit if there are violations (for CI)
        process.exitCode = 1;
        return;
      }

      const sampleElapsedMs = Date.now() - sampleStartTimeMs;
      const remainingIntervalMs = Math.max( 0, intervalMs - sampleElapsedMs );

      // Wait only the remaining interval so sampling cadence is faster.
      if ( remainingIntervalMs > 0 ) {
        await page.waitForTimeout( remainingIntervalMs );
      }
    }

    // Report success so CI logs show completion without violations.
    console.log( '[test-a11y-audit] No violations detected after fuzz sampling.' );
  }
  finally {
    await browser.close();
  }
}

runAxeDevTests().catch( err => {
  console.error( err );
  process.exit( 1 );
} );
