const {Toolkit} = require('actions-toolkit');

Toolkit.run(tools => {
  // Ensure that the actor of the triggering action is one of us

  // Identify the active sprint board

  // Add the issue/pull request to the sprint board
  tools.exit.success('We did it!');
}, {
  event: ['issues.assigned', 'pull_request.opened'],
  secrets: ['GITHUB_TOKEN'],
});
