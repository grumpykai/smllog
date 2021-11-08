var SerialPort = require("serialport");
const Delimiter = require("@serialport/parser-delimiter");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let lastSentTimestamp = 0;
const collectedReadings = {};

const programParams = require("./params.json");

const deviceParamConfig = {
  mainDevice: {
    serialPath: "/dev/ttyUSB0",
    bytes: 8,
    registers: [
      {
        obis: "1.8.1",
        urlParam: "h",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
      {
        obis: "1.8.2",
        urlParam: "n",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x02, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
      {
        obis: "2.8.0",
        urlParam: "e",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
    ],
  },
  generationDevice: {
    serialPath: "/dev/ttyUSB1",
    bytes: 5,
    registers: [
      {
        obis: "2.8.1",
        urlParam: "p",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x56,
        ]),
      },
    ],
  },
};

//   sprintf(ascii,"%s%lu&n=%lu&e=%lu&p=%lu", "/sunnylog/meterupload.php?h=", mvBezugHT, mvBezugNT, mvEinspeisung, mvPVProduction );

SerialPort.list().then((ports) => {
  ports.forEach(function (port) {
    console.log(port.path, port.pnpId, port.manufacturer); // or console.log(port)
  });
});

deviceReader(deviceParamConfig.mainDevice);
deviceReader(deviceParamConfig.generationDevice);

function deviceReader(deviceParams) {
  const port = new SerialPort(deviceParams.serialPath, { autoOpen: false });

  port.open(function (err) {
    if (err) {
      return console.log("Error opening port: ", err.message);
    }
  });

  port.on("open", function () {
    console.log(`Port ${port.path} opened.`);
  });

  const parser = port.pipe(
    new Delimiter({ delimiter: [0x1b, 0x1b, 0x1b, 0x1b] })
  );

  parser.on("data", (buf) => {
    for (const register of deviceParams.registers) {
      let reading = readMeter(buf, register.delimiter, deviceParams.bytes);
      if (reading)
        console.log(`OBIS: ${register.obis}, Meter Reading: ${reading}`);
      collectedReadings[register.urlParam] = reading;
    }
    sendAfterInterval();
  });
}

function sendAfterInterval() {
  const now = Date.now();
  let url = programParams.url + "?d=1";

  if (now > lastSentTimestamp + 10000) {
    let validReadings = 0;
    for (const param in collectedReadings) {
      if (collectedReadings[param] > 0) {
        url = url + "&" + param + "=" + collectedReadings[param];
      }
      validReadings++;
    }
    if (validReadings == 4) {
      //Todo : needs to be count from Device Params with urlparam set
      console.log(url);
      lastSentTimestamp = now;
    }
  }
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
