function log(...args) {
  process.send({type: 'log', data: args});
}

const {GitProcess} = require('dugite');

log('forking');
let tock = 0;
const tick = function() {
  log('tick ', tock++);
  setTimeout(tick, 250);
};
// tick();

process.on('message', amount => {
  const startTime = process.uptime();
  const str = 'a'.repeat(amount);
  const execTime = (process.uptime() - startTime) * 1000;
  process.send({
    type: 'git',
    data: {exitCode: 0, stdout: str, stderr: '', time: execTime},
  });
  // GitProcess.exec(args, '/Users/kuychaco/src/test-repo')
  // .then(({stdout, stderr, exitCode}) => {
  //   const execTime = (process.uptime() - startTime) * 1000;
  //   process.send({
  //     type: 'git',
  //     data: {exitCode, stdout, stderr, time: execTime},
  //   });
  // });
});


// console.log('forkin!');
//
// process.on('message', msg => {
//   console.log('child got message:', msg);
//   process.send(msg);
//   // process.send('Do I have electron? ' + !!require('fs'));
// });
