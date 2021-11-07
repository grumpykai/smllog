var SerialPort = require("serialport");
const Delimiter = require("@serialport/parser-delimiter");

const registerDelimiters = {
  highTariff: Uint8Array.from([
    0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62, 0x1e,
    0x52, 0xff, 0x59,
  ]),
  lowTariff: Uint8Array.from([
    0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x02, 0xff, 0x01, 0x01, 0x62, 0x1e,
    0x52, 0xff, 0x59,
  ]),
  feedIn: Uint8Array.from([
    0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xff, 0x01, 0x01, 0x62, 0x1e,
    0x52, 0xff, 0x59,
  ]),
};

SerialPort.list().then((ports) => {
  ports.forEach(function (port) {
    console.log(port.comName, port.pnpId, port.manufacturer); // or console.log(port)
  });
});

const port = new SerialPort("/dev/ttyUSB0", { autoOpen: false });

port.open(function (err) {
  if (err) {
    return console.log("Error opening port: ", err.message);
  }

  // Because there's no callback to write, write errors will be emitted on the port:
  port.write("main screen turn on");
});

// The open event is always emitted
port.on("open", function () {
  // open logic
});

// port.on("readable", function () {
//   console.log("Data:", port.read());
// });

const parser = port.pipe(
  new Delimiter({ delimiter: [0x1b, 0x1b, 0x1b, 0x1b] })
);
parser.on("data", (buf) => {
  let registerHigh = readMeter(buf, registerDelimiters.highTariff);
  if (registerHigh >= 0) {
    let registerLow = readMeter(buf, registerDelimiters.lowTariff);
    let registerFeedIn = readMeter(buf, registerDelimiters.feedIn);
    console.log(
      `HT: ${registerHigh}, NT: ${registerLow}, Feed: ${registerFeedIn}`
    );
  }
});

// int delHT[] = {
//     0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x01, 0xFF, 0x01, 0x01, 0x62, 0x1E, 0x52, 0xFF, 0x59 };
//   int delNT[] = {
//     0x77, 0x07, 0x01, 0x00, 0x01, 0x08, 0x02, 0xFF, 0x01, 0x01, 0x62, 0x1E, 0x52, 0xFF, 0x59 };
//   int delEN[] = {
//     0x77, 0x07, 0x01, 0x00, 0x02, 0x08, 0x01, 0xFF, 0x01, 0x01, 0x62, 0x1E, 0x52, 0xFF, 0x59 };

function readMeter(buf, delimiter) {
  let index = buf.indexOf(delimiter);
  let reading = 0;
  if (index >= 0) {
    for (let i = 0; i < 8; i++) {
      reading = reading * 256 + buf[index + 15 + i];
    }
    // console.log("HT at " + index + " Reading: " + reading);
  }
  return reading;
}
