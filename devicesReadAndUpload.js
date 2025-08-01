var SerialPort = require("serialport");

//const mqtt = require('mqtt');

const Delimiter = require("@serialport/parser-delimiter");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let lastSentTimestamp = 0;
let lastMqttTimestamp = 0;
const collectedReadings = {};
const currentReading = {};
const lastReading = {};

let lastWattTimestamp = 0;

//const client = mqtt.connect('mqtt://test.mosquitto.org');

let programParams;

try {
  programParams = require("./params.json");
  console.log(
    `[INIT] params.json loaded. URL for upload: ${programParams.url}`
  );
} catch (err) {
  console.log(`[ERROR] when trying to load prgram parameters from params.json`);
}

const uploadInterval = programParams.uploadInterval || 60000;

console.log(`[INIT] Upload Interval is ${uploadInterval / 1000} seconds.`);

const deviceParamConfig = programParams.deviceParameters;

console.log(deviceParamConfig.mainDevice);

const registerCountForUpload = countRegistersForUpload(deviceParamConfig);

SerialPort.list().then((ports) => {
  ports.forEach(function (port) {
    console.log(port.path, port.pnpId, port.manufacturer); // or console.log(port)
  });
});

// ToDo: create readers dynamically based on device Config
deviceReader(deviceParamConfig.mainDevice);
deviceReader(deviceParamConfig.generationDevice);

function deviceReader(deviceParams) {
  const port = new SerialPort(deviceParams.serialPath, { autoOpen: false });

  port.open(function (err) {
    if (err) {
      return console.log(
        "[ERROR] when trying to open Serial port: ",
        err.message
      );
    }
  });

  port.on("open", function () {
    console.log(`[INIT]: Serial Port ${port.path} opened.`);
  });

  const parser = port.pipe(
    new Delimiter({ delimiter: [0x1b, 0x1b, 0x1b, 0x1b] })
  );

  parser.on("data", (buf) => {
    for (const register of deviceParams.registers) {
      let reading = readMeter(
        buf,
        Uint8Array.from(register.delimiter),
        deviceParams.bytes
      );
      // if (reading)
      // console.log(`OBIS: ${register.obis}, Meter Reading: ${reading}`);
      if (reading > 0 && register.urlParam) {
        collectedReadings[register.urlParam] = reading;
        currentReading[register.urlParam] = { value: reading, timestamp: Date.now() };
        calcWattage(register.urlParam);
      }
    }
    sendAfterInterval();
  });
}

function calcWattage(urlParam) {

  if (currentReading[urlParam]) {

    const { value, timestamp } = currentReading[urlParam];

    if (lastReading[urlParam]) {

      //console.log(`[DEBUG] Calculating wattage for ${urlParam}: ${value} at ${timestamp}`);

      const lastValue = lastReading[urlParam].value;
      const lastTimestamp = lastReading[urlParam].timestamp;

      if (lastValue && lastTimestamp && lastTimestamp < timestamp - 10000) {
        const timeDiff = (timestamp - lastTimestamp)
        const wattage = ((value - lastValue) / timeDiff) * 3.6 * 1000; // in watts
        console.log(`Wattage for ${urlParam}: ${wattage} W, Time Diff: ${timeDiff} s`);
        lastReading[urlParam] = { value, timestamp };
      }
    }
    else {
      lastReading[urlParam] = { value, timestamp };
    }

    // Publish to MQTT  
    /*  if (client.connected && Date.now() - lastMqttTimestamp > 10000) {
        client.publish(`grumpykai-test-energy`, JSON.stringify({ [urlParam]: value }));
        lastMqttTimestamp = Date.now();
        console.log(`[MQTT] Published ${urlParam}: ${value}`);
      }
  */
  }

}

function sendAfterInterval() {
  const now = Date.now();
  let url = programParams.url + "?d=1";

  if (now > lastSentTimestamp + uploadInterval) {
    let validReadings = 0;
    for (const param in collectedReadings) {
      if (collectedReadings[param] > 0) {
        url = url + "&" + param + "=" + collectedReadings[param];
        validReadings++;
      }
    }
    if (validReadings == registerCountForUpload) {
      console.log(`[INFO] Readings: ${validReadings}, URL: ${url}`);
      httpGet(url);
      lastSentTimestamp = now;
    }
  }
}

function httpGet(url) {
  fetch(url)
    .then((response) => {
      response
        .text()
        .then((text) => console.log(text))
        .catch((err) =>
          console.log("[ERROR] Promise rejected - HTTP response.text() " + err)
        );
    })
    .catch((err) =>
      console.log("[ERROR] Promise rejected - HTTP fetch()  " + err)
    );
}

function readMeter(buf, delimiter, byteCount = 8) {
  let index = buf.indexOf(delimiter);
  let reading = 0;
  if (index >= 0) {
    for (let i = 0; i < byteCount; i++) {
      reading = reading * 256 + buf[index + 15 + i];
    }
  }
  return reading;
}

function countRegistersForUpload(deviceParamConfig) {
  let count = 0;
  for (const deviceKey in deviceParamConfig) {
    for (const register of deviceParamConfig[deviceKey].registers) {
      if (register.urlParam) count++;
    }
  }
  console.log(`[INIT] ${count} registers for upload.`);
  return count;
}
