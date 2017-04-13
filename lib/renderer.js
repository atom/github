const {GitProcess} = require('dugite');

const ipc = require('electron').ipcRenderer;

ipc.on('ping', (event, webContentsId, {args, workingDir, options, operationId, timeSent}) => {
  const formattedArgs = `git ${args.join(' ')} in ${workingDir}`;
  console.log('operationId', operationId, formattedArgs);
  const startTime = process.uptime();
  // For profiling purposes
  // const str = 'a'.repeat(amount);
  // const execTime = (process.uptime() - startTime) * 1000;
  // event.sender.sendTo(webContentsId, 'pong', {
  //   type: 'git',
  //   data: {exitCode: 0, stdout: str, stderr: '', time: execTime},
  // });

  if (process.env.PRINT_GIT_TIMES) {
    console.time(`git:${formattedArgs}`);
  }
  GitProcess.exec(args, workingDir, options)
    .then(({stdout, stderr, exitCode}) => {
      // timingMarker.finalize();
      // if (process.env.PRINT_GIT_TIMES) {
      //   console.timeEnd(`git:${formattedArgs}`);
      // }
      // if (gitPromptServer) {
      //   gitPromptServer.terminate();
      // }
      // subscriptions.dispose();

      // if (diagnosticsEnabled) {
      //   const headerStyle = 'font-weight: bold; color: blue;';
      //
      //   console.groupCollapsed(`git:${formattedArgs}`);
      //   console.log('%cexit status%c %d', headerStyle, 'font-weight: normal; color: black;', exitCode);
      //   console.log('%cstdout', headerStyle);
      //   console.log(stdout);
      //   console.log('%cstderr', headerStyle);
      //   console.log(stderr);
      //   console.groupEnd();
      // }

      let err = null;
      if (exitCode) {
        err = {
          message: `${formattedArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`,
          code: exitCode,
          stdErr: stderr,
          stdOut: stdout,
          command: formattedArgs,
        };
      }
      const execTime = (process.uptime() - startTime) * 1000;
      console.log(operationId);
      console.log(stdout);
      event.sender.sendTo(webContentsId, 'pong', {
        type: 'git',
        data: {result: stdout, err, execTime, operationId, timeSent, formattedArgs},
      });
    });
});
