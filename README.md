# smllog

SML Logger using NodeJS on Raspberry PI

Uses IR Head connected to USB Port of Raspberry PI

# Preparation (on Raspberry PI)

The NPM Package serialport must be installed from source on Raspberry PI

## Install Node 12.x

```bash
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential
```

## Install node-gyp and node-pre-gyp globally

```bash
sudo npm install -g node-gyp
sudo npm install -g node-pre-gyp
sudo npm install serialport --unsafe-perm
```
