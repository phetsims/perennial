// Copyright 2017, University of Colorado Boulder


const constants = require( './constants' );
const emailjs = require( 'emailjs' );
const mimelib = require( 'mimelib' );
const winston = require( 'winston' );

// configure email server
let emailClient;
if ( constants.BUILD_SERVER_CONFIG.emailUsername && constants.BUILD_SERVER_CONFIG.emailPassword && constants.BUILD_SERVER_CONFIG.emailTo ) {
  emailClient = new emailjs.SMTPClient( {
    user: constants.BUILD_SERVER_CONFIG.emailUsername,
    password: constants.BUILD_SERVER_CONFIG.emailPassword,
    host: constants.BUILD_SERVER_CONFIG.emailServer,
    ssl: false
  } );
}
else {
  winston.log( 'warn', 'failed to set up email server, missing one or more of the following fields in build-local.json:\n' +
                       'emailUsername, emailPassword, emailTo' );
}

/**
 * Send an email. Used to notify developers if a build fails
 * @param subject
 * @param text
 * @param emailParameter - recipient defined per request
 * @param emailParameterOnly - if true send the email only to the passed in email, not to the default list as well
 */
module.exports = function sendEmail( subject, text, emailParameter, emailParameterOnly ) {
  if ( emailClient ) {
    let emailTo = constants.BUILD_SERVER_CONFIG.emailTo;

    if ( emailParameter ) {
      if ( emailParameterOnly ) {
        emailTo = emailParameter;
      }
      else {
        emailTo += ( `, ${emailParameter}` );
      }
    }

    // don't send an email if no email is given
    if ( emailParameterOnly && !emailParameter ) {
      return;
    }

    winston.log( 'info', 'attempting to send email' );
    emailClient.send( {
        text: text,
        from: 'PhET Build Server <phethelp@colorado.edu>',
        to: emailTo,
        subject: subject
      },
      ( err, message ) => {
        if ( err ) {
          let errorString = typeof err === 'string' ? err : JSON.stringify( err );
          if ( errorString.includes( constants.BUILD_SERVER_CONFIG.emailPassword ) ) {
            errorString = "possible bad password, error redacted"
          }
          winston.log( 'error', `error when attempted to send email, err = ${errorString}` );
        }
        else {
          winston.log( 'info', `sent email to: ${message.header.to
          }, subject: ${mimelib.decodeMimeWord( message.header.subject )
          }, text: ${message.text}` );
        }
      }
    );
  }
};