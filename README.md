Table of Contents

- [About](#about)
- [Preparation (on Raspberry PI)](#preparation-on-raspberry-pi)
  - [Install Node 12.x](#install-node-12x)
  - [Install node-gyp and node-pre-gyp globally](#install-node-gyp-and-node-pre-gyp-globally)
  - [Adding to crontab](#adding-to-crontab)
- [Required Configuration](#required-configuration)

# About

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

## Adding to crontab

```crontab
# m h  dom mon dow   command
@reboot /home/pi/smllog/devicesReadAndUpload.sh
```

# Required Configuration

The Upload URL **must** be configured in file **params.json**. A template for the file is supplied as params-template.json

```json
{
  "url": "http://<<SERVER:PORT>/PATH",
  "uploadInterval": 60000
}
```

Node-Fetch is used to send the meter readings via GET to that url. The get parameter names can be configured in the device configuration, also in file **params.json**
