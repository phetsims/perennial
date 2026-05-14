// Copyright 2026, University of Colorado Boulder

/**
 * A Mutex object for locking out git commands that MUTATE state.
 *
 * Additionally, commands that indicate whether a git execute operation is mutable or immutable, AND
 * the mutex locking on the mutable form.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { Mutex } from 'async-mutex';
import execute, { ExecuteOptions, ExecuteResult } from './execute.js';
import fs from 'fs';

export const gitMutex = new Mutex();

const DEBUG_CWD = true;

export const gitExclusive = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  return await gitMutex.runExclusive( callback );
};

// TypeScript fun to get this to type-check, similar to execute
export function gitMutableExecute(
  args: string[],
  cwd: string,
  options: { errors: 'resolve' } & Partial<ExecuteOptions>
): Promise<ExecuteResult>;
export function gitMutableExecute(
  args: string[],
  cwd: string,
  options?: { errors?: 'reject' } & Partial<ExecuteOptions>
): Promise<string>;

// TODO: use this everywhere it is needed ---- find execute( 'git'
export async function gitMutableExecute(
  args: string[],
  cwd: string,
  providedOptions?: ExecuteOptions
): Promise<string | ExecuteResult> {
  if ( DEBUG_CWD && !fs.existsSync( cwd ) ) {
    throw new Error( `gitMutableExecute: directory ${cwd} does not exist` );
  }

  // @ts-expect-error
  return gitExclusive( () => execute( 'git', args, cwd, providedOptions ) );
}


// TypeScript fun to get this to type-check, similar to execute
export function gitImmutableExecute(
  args: string[],
  cwd: string,
  options: { errors: 'resolve' } & Partial<ExecuteOptions>
): Promise<ExecuteResult>;
export function gitImmutableExecute(
  args: string[],
  cwd: string,
  options?: { errors?: 'reject' } & Partial<ExecuteOptions>
): Promise<string>;

// TODO: use this everywhere it is needed
export async function gitImmutableExecute(
  args: string[],
  cwd: string,
  providedOptions?: ExecuteOptions
): Promise<string | ExecuteResult> {
  if ( DEBUG_CWD && !fs.existsSync( cwd ) ) {
    throw new Error( `gitImmutableExecute: directory ${cwd} does not exist` );
  }

  // @ts-expect-error
  return execute( 'git', args, cwd, providedOptions );
}