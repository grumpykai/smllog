var SerialPort = require("serialport");
const Delimiter = require("@serialport/parser-delimiter");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let lastSentTimestamp = 0;
const collectedReadings = {};

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
// {
//   mainDevice: {
//     serialPath: "/dev/ttyUSB0",
//     bytes: 8,
//     registers: [
//       {
//         obis: "1.8.1",
//         urlParam: "h",
//         delimiter: Uint8Array.from([
//           0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
//           0x1e, 0x52, 0xff, 0x59,
//         ]),
//       },
//       {
//         obis: "1.8.2",
//         urlParam: "n",
//         delimiter: Uint8Array.from([
//           0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x02, 0xff, 0x01, 0x01, 0x62,
//           0x1e, 0x52, 0xff, 0x59,
//         ]),
//       },
//       {
//         obis: "2.8.0",
//         urlParam: "e",
//         delimiter: Uint8Array.from([
//           0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
//           0x1e, 0x52, 0xff, 0x59,
//         ]),
//       },
//     ],
//   },
//   generationDevice: {
//     serialPath: "/dev/ttyUSB1",
//     bytes: 5,
//     registers: [
//       {
//         obis: "2.8.1",
//         urlParam: "p",
//         delimiter: Uint8Array.from([
//           0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
//           0x1e, 0x52, 0xff, 0x56,
//         ]),
//       },
//     ],
//   },
// };

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
      let reading = readMeter(buf, register.delimiter, deviceParams.bytes);
      // if (reading)
      // console.log(`OBIS: ${register.obis}, Meter Reading: ${reading}`);
      collectedReadings[register.urlParam] = reading;
    }
    sendAfterInterval();
  });
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
