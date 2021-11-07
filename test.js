var SerialPort = require("serialport");

SerialPort.list().then((ports) => {
  ports.forEach(function (port) {
    console.log(port.comName, port.pnpId, port.manufacturer); // or console.log(port)
  });
});
