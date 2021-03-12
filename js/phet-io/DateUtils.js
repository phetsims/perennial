// Copyright 2021, University of Colorado Boulder
module.exports = {
  toGitHubDate( date ) {
    return `${date.toISOString().split( 'T' )[ 0 ]} 23:59`;
  },
  toFilename( date ) {
    return this.toGitHubDate( date ).replace( /:/, '_' );
  },
  getTestDates() {
    const currentDate = new Date();

    const dates = [];
    for ( let i = 0; i < 10; i++ ) {
      const dateToOutput = new Date();
      dateToOutput.setDate( currentDate.getDate() - 10 * i );
      dates.push( dateToOutput );
    }
    console.log( dates.join( '\n' ) );

    return dates;
  }
};