var SerialPort = require("serialport");

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

port.on("readable", function () {
  console.log("Data:", port.read());
});

// Switches the port into "flowing mode"
port.on("data", function (data) {
  console.log("Data:", data);
});
