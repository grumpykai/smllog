#!/bin/bash

# Load nvm
# export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# nvm use default

# now node works
node -e "console.log('Checking NodeJS - Success :)\nNodeJS Version is:')"
node --version

# npm works too!
# npm --version

cd /home/pi/smllog
node devicesReadAndUpload.js > log_devicesReadAndUpload.log