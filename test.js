var SerialPort = require("serialport");
const Delimiter = require("@serialport/parser-delimiter");

const deviceParamConfig = {
  mainDevice: {
    serialPath: "/dev/ttyUSB0",
    registers: [
      {
        obis: "1.8.1",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
      {
        obis: "1.8.2",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x02, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
      {
        obis: "2.8.0",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x59,
        ]),
      },
    ],
  },
  generationDevice: {
    serialPath: "/dev/ttyUSB1",
    registers: [
      {
        obis: "2.8.1",
        delimiter: Uint8Array.from([
          0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62,
          0x1e, 0x52, 0xff, 0x56,
        ]),
      },
    ],
  },
};

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
      let reading = readMeter(buf, deviceParams.register.delimiter);
      console.log(`OBIS: ${register.obis}, Meter Reading: ${reading}`);
    }
  });
}

function readMeter(buf, delimiter) {
  let index = buf.indexOf(delimiter);
  let reading = 0;
  if (index >= 0) {
    for (let i = 0; i < 8; i++) {
      reading = reading * 256 + buf[index + 15 + i];
    }
  }
  return reading;
}
