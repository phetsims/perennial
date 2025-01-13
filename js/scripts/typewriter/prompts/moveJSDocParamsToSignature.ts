// Copyright 2025, University of Colorado Boulder
// @author Sam Reid (PhET Interactive Simulations)

/* eslint-disable phet/bad-typescript-text */
export default [
  {
    role: 'user',
    content: 'We are converting JavaScript to TypeScript. Here is an instance method, potentially with JSDoc. Please move ' +
             'the JSDoc annotations to the method signature. Note that any documentation in @param must be preserved, but ' +
             'remove the {Type}. Don\'t worry about imports, I will do those later. If none of the @param have any documentation, then remove all @params entirely. ' +
             'Do not add, remove or change documentation. Preserve it. If any param has type @param {Object}, specify IntentionalAny in the type declaration. I will fix it later. ' +
             'If no changes are needed then just output the same text. Do not use code fences. Do not explain reasoning, just do your best and output code only:'
  },
  {
    role: 'user',
    content: '  /**\n' +
             '   * Step the model (automatically called by joist)\n' +
             '   * @public\n' +
             '   * @override\n' +
             '   *\n' +
             '   * @param {number} dt - in seconds\n' +
             '   */\n' +
             '  step( dt )'
  },
  {
    role: 'assistant',
    content: '  /**\n' +
             '   * Step the model (automatically called by joist)\n' +
             '   *\n' +
             '   * @param dt - in seconds\n' +
             '   */\n' +
             '  public step( dt: number ): void'
  },
  {
    role: 'user',
    content: '  /**\n' +
             '   * The skater moves along the ground with the same coefficient of fraction as the tracks, see #11. Returns a\n' +
             '   * SkaterState that is applied to this.skater.\n' +
             '   * @private\n' +
             '   *\n' +
             '   * @param {number} dt\n' +
             '   * @param {SkaterState} skaterState\n' +
             '   *\n' +
             '   * @returns {SkaterState}\n' +
             '   */\n' +
             '  stepGround( dt, skaterState )'
  }, {
    role: 'assistant',
    content: '  /**\n' +
             '   * The skater moves along the ground with the same coefficient of fraction as the tracks, see #11. Returns a\n' +
             '   * SkaterState that is applied to this.skater.\n' +
             '   */\n' +
             '  private stepGround( dt: number, skaterState: SkaterState ): SkaterState'
  } ];