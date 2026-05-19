// Copyright 2026, University of Colorado Boulder

/**
 * ANSI colors for terminals.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const supportsColor = process.stdout.isTTY && process.stdout.getColorDepth() > 1;

export const ANSI_BLACK = supportsColor ? '\x1b[30m' : '';
export const ANSI_RED = supportsColor ? '\u001b[31m' : '';
export const ANSI_GREEN = supportsColor ? '\u001b[32m' : '';
export const ANSI_YELLOW = supportsColor ? '\x1b[33m' : '';
export const ANSI_BLUE = supportsColor ? '\x1b[34m' : '';
export const ANSI_MAGENTA = supportsColor ? '\x1b[35m' : '';
export const ANSI_CYAN = supportsColor ? '\x1b[36m' : '';
export const ANSI_WHITE = supportsColor ? '\x1b[37m' : '';

export const ANSI_GRAY = supportsColor ? '\x1b[90m' : '';
export const ANSI_BRIGHT_RED = supportsColor ? '\x1b[91m' : '';
export const ANSI_BRIGHT_GREEN = supportsColor ? '\x1b[92m' : '';
export const ANSI_BRIGHT_YELLOW = supportsColor ? '\x1b[93m' : '';
export const ANSI_BRIGHT_BLUE = supportsColor ? '\x1b[94m' : '';
export const ANSI_BRIGHT_MAGENTA = supportsColor ? '\x1b[95m' : '';
export const ANSI_BRIGHT_CYAN = supportsColor ? '\x1b[96m' : '';
export const ANSI_BRIGHT_WHITE = supportsColor ? '\x1b[97m' : '';

export const ANSI_RESET = supportsColor ? '\u001b[0m' : '';
