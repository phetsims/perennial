// Copyright 2017, University of Colorado Boulder


const constants = require( './constants' );
const winston = require( 'winston' );
const nodemailer = require( 'nodemailer' );

// configure email server
let transporter;
if ( constants.BUILD_SERVER_CONFIG.emailUsername && constants.BUILD_SERVER_CONFIG.emailPassword && constants.BUILD_SERVER_CONFIG.emailTo ) {
  transporter = nodemailer.createTransport( {
    auth: {
      user: constants.BUILD_SERVER_CONFIG.emailUsername,
      pass: constants.BUILD_SERVER_CONFIG.emailPassword
    },
    host: constants.BUILD_SERVER_CONFIG.emailServer,
    port: 587,
    tls: {
      ciphers: 'SSLv3'
    }
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
module.exports = async function sendEmail( subject, text, emailParameter, emailParameterOnly ) {
  if ( transporter ) {
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

    try {
      const emailResult = await transporter.sendMail( {
        from: `"PhET Mail" <${constants.BUILD_SERVER_CONFIG.emailUsername}>`,
        to: emailTo,
        subject: subject,
        text: text.replace( /([^\r])\n/g, '$1\r\n' ) // Replace LF with CRLF, bare line feeds are rejected by some email clients,
      } );

      winston.info( `sent email: ${emailTo}, ${subject}, ${emailResult.messageId}, ${emailResult.response}` );
    }
    catch( err ) {
      let errorString = typeof err === 'string' ? err : JSON.stringify( err );
      errorString = errorString.replace( constants.BUILD_SERVER_CONFIG.emailPassword, '***PASSWORD REDACTED***' );
      winston.error( `error when attempted to send email, err = ${errorString}` );
    }
  }
};