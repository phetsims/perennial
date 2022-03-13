# build-server.js

PhET build and deploy server.

# Host

The production version of the build server runs on **phet-server2.int.colorado.edu**, the same host as the PhET production website.

A test version of the server runs on **phet-server-dev.int.colorado.edu**.

## Starting and Stopping the Server

To start, stop, or restart the build server, run this command:
`sudo systemctl [start|stop|restart] build-server`

Starting the build-server runs the application that is currently checked out at `/data/share/phet/phet-repos/perennial`.  You must use the `phet-admin` account for all git operations on this repo, e.g. `sudo -u phet-admin git pull`.

To edit startup options, please see `/usr/lib/systemd/system/build-server.service`

## Log Files

To view the log:`sudo journalctl -u build-server`

To tail the log: `sudo journalctl -u build-server -f`

To tail a specific number of lines (e.g. 500): `sudo journalctl -u build-server -f -n 500`

Pressing Shift+F will scroll to the end (navigation is `less`-like).

## Build Server Configuration

The "dev server" is currently `bayes.colorado.edu`. The "production server" is currently `phet-server2.colorado.edu`

All of the phet repos live on the production and dev servers under /data/share/phet/phet-repos. The build server lives
in perennial: `/data/share/phet/phet-repos/perennial/js/build-server`.

The build-server is run as user "phet-admin". It requires the certain fields filled out in
phet-admin's `HOME/.phet/build-local.json`
(see assertions in getBuildServerConfig.js). These fields are already filled out, but they may need to modified or
updated.

The build server is configured to send an email on build failure. The configuration for sending emails is also in
phet-admin's `HOME/.phet/build-local.json` (these fields are described in getBuildServerConfig.js). To add other email
recipients, you can add email addresses to the emailTo field in this file.

Additionally, phet-admin needs an ssh key set up to copy files from the production server to the dev server. This should
already be set up, but should you to do to set it up somewhere else, you'll need to have an rsa key in ~/.ssh on the
production server and authorized
(run "ssh-keygen -t rsa" to generate a key if you don't already have one). Also, you will need to add an entry for the
dev server in `~/.ssh/config` like so:

```
Host {{dev server host name, e.g. bayes}}
    HostName {{dev server FQDN, e.g. bayes.colorado.edu.}}
    User [identikey]
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

On the dev server, you'll need to add the public key from the production server to a file ~/.ssh/authorized_keys. You
can usually do this by running `ssh-copy-id {{dev server}}`.

build-server log files can be tailed by running /usr/lib/systemd/system/build-server.service

build-server needs to be able to make commits to github to notify rosetta that a new sim is translatable. To do this,
There must be valid git credentials in the .netrc file phet-admin's home directory.

## Using the Build Server for Production Deploys with Chipper 2.0

The build server starts a build process upon receiving an https POST request to /deploy-html-simulation. It takes as
input a JSON object with the following properties:

    const servers = req.body[ constants.SERVERS_KEY ];
    const brands = req.body[ constants.BRANDS_KEY ];

- `{String} api` - the only option is `"2.0"`
- `{JSON.Array<String>} brands` - a list brands to deploy.
- `{JSON.Array<String>} servers` - a list of servers to receive the deployment. Should be a subset
  of `[ "dev", "production" ]`
- `{JSON.Array} dependencies` - a json object with dependency repos and shas, in the form of dependencies.json files
- `{JSON.Array} locales` - a list of locales to build (optional, defaults to all locales in babel).
- `{String} simName` - the standardized name of the sim, lowercase with hyphens instead of spaces (i.e. area-builder)
- `{String} version` - the version to be built.
- `{String} authorizationCode` - a password to authorize legitimate requests
- `{String} email` - optional parameter, used to send success/failure notifications
- `{Number} translatorId` - optional parameter for production/rc deploys, required for translation deploys from rosetta
  to add the user's credit to the website.

## Using the Build Server for Production Deploys with Chipper 1.0

The build server starts a build process upon receiving an https POST request to /deploy-html-simulation. It takes as
input a JSON object with the following properties:

- `repos` - a json object with dependency repos and shas, in the form of dependencies.json files
- `locales` - a comma-separated list of locales to build (optional, defaults to all locales in babel)
- `simName` - the standardized name of the sim, lowercase with hyphens instead of spaces (i.e. area-builder)
- `version` - the version to be built. Production deploys will automatically strip everything after the
  major.minor.maintenance
- `authorizationCode` - a password to authorize legitimate requests
- `option` - optional parameter, can be set to "rc" to do an rc deploy instead of production
- `email` - optional parameter, used to send success/failure notifications
- `translatorId` - optional parameter for production/rc deploys, required for translation deploys from rosetta to add
  the user's credit to the website.

## What the Build Server Does

The build server does the following steps when a deploy request is received:

- checks the authorization code, unauthorized codes will not trigger a build
- puts the build task on a queue so multiple builds don't occur simultaneously
- pull perennial and npm update
- clone missing repos
- pull master for the sim and all dependencies
- grunt checkout-shas
- checkout sha for the current sim
- npm update in chipper and the sim directory
- grunt build-for-server --brands=phet for selected locales (see chipper's Gruntfile for details)
- for rc deploys:
    - deploy to the dev server, checkout master for all repositories, and finish
- for production deploys:
    - mkdir for the new sim version
    - copy the build files to the correct location in the server doc root
    - write the .htaccess file for indicating the latest directory and downloading the html files
    - write the XML file that tells the website which translations exist
    - notify the website that a new simulation/translation is published and should appear
    - add the sim to rosetta's simInfoArray and commit and push (if the sim isn't already there)
    - checkout master for all repositories

If any of these steps fails, the build aborts and grunt checkout-master-all is run so all repos are back on master
