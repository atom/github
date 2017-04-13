// console.log('wooooo');
//
// const renderer = require('electron').ipcRenderer;

// renderer.on('data', event => {
//   console.log('renderer got message:', event);
//   const startTime = process.uptime();
//   const str = '1234567890'.repeat(400000);
//   const execTime = (process.uptime() - startTime) * 1000;
//   const {BrowserWindow} = require('electron').remote;
//   debugger;
//   const myWindow = BrowserWindow.fromWebContents(event.sender);
//   // console.log('browser window', myWindow);
//   // myWindow.webContents.send('data');
  // myWindow.webContents.send('data', {
  //   type: 'git',
  //   data: {exitCode: 0, stdout: str, stderr: '', time: execTime},
  // });
// });


const ipc = require('electron').ipcRenderer;

ipc.on('ping', (event, webContentsId, amount) => {
  const startTime = process.uptime();
  const str = 'a'.repeat(amount);
  const execTime = (process.uptime() - startTime) * 1000;
  event.sender.sendTo(webContentsId, 'pong', {
    type: 'git',
    data: {exitCode: 0, stdout: str, stderr: '', time: execTime},
  });
});
