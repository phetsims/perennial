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
const DEFAULT_QUERY_FLAGS = [ 'ea' ] as const;

// Minimum impact level reported when no --impact is supplied.
const DEFAULT_MIN_IMPACT: AxeImpact = 'minor';

// Axe rule IDs suppressed from reporting.
const SUPPRESSED_VIOLATION_IDS = new Set( [ 'meta-viewport' ] );

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

    const url = buildTargetUrl();
    console.log( `[test-a11y-audit] Launching ${url}` );
    await page.goto( url, {
      waitUntil: 'networkidle'
    } );

    const minimumImpact = getMinimumImpact();
    const results = await new AxeBuilder( { page: page } ).analyze();
    const filteredViolations = results.violations.filter( violation => {
      if ( SUPPRESSED_VIOLATION_IDS.has( violation.id ) ) {
        return false;
      }
      return includeViolation( violation.impact, minimumImpact );
    } );

    console.log( 'Violations:', JSON.stringify( filteredViolations, null, 2 ) );

    // Non-zero exit if there are violations (for CI)
    if ( filteredViolations.length > 0 ) {
      process.exitCode = 1;
    }
  }
  finally {
    await browser.close();
  }
}

runAxeDevTests().catch( err => {
  console.error( err );
  process.exit( 1 );
} );
