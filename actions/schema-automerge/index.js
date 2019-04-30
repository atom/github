const {Toolkit} = require('actions-toolkit');

Toolkit.run(async tools => {
  let commitOid;
  const pullRequests = [];

  // Determine the commit oid and associated pull requests from the event payload.
  if (tools.context.event === 'check_suite') {
    commitOid = tools.payload.check_suite.head_sha;
    const labelledPullRequests = tools.payload.check_suite.pull_requests
      .filter(pr => pr.labels.some(label => label.name === 'schema update'))
      .map(pr => pr.node_id);
    pullRequests.push(...labelledPullRequests);
  } else if (tools.context.event === 'status') {
    commitOid = tools.payload.sha;
    const {data: associatedPRs} = await tools.github.graphql(`
      query PullRequests($owner: String!, $repo: String!, $commitOid: GitObjectID!) {
        repository(owner: $owner, name: $repo) {
          object(oid: $commitOid) {
            ... on Commit {
              associatedPullRequests(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
                totalCount
                nodes {
                  id
                  headRefOid
                  state
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, {
      ...tools.context.repo,
      commitOid,
    });

    if (!associatedPRs.object) {
      tools.exit.failure(`Unable to find git object: ${commitOid}`);
    }

    const labelledPullRequests = associatedPRs.object.associatedPullRequests.nodes
      .filter(n => n.labels.nodes.some(l => l.name === 'schema update'))
      .filter(n => n.headRefOid === commitOid)
      .filter(n => n.state === 'OPEN')
      .map(n => n.id);

    pullRequests.push(...labelledPullRequests);
  } else {
    throw new Error(`Unexpected event: ${tools.context.event}`);
  }

  tools.log.info(`Discovered ${pullRequests.length} pull requests matching the event sha.`);
  if (pullRequests.length === 0) {
    tools.exit.neutral("No labelled pull request associated with this event's commit.");
  }

  if (pullRequests.length > 1) {
    tools.log.warn(`Multiple associated pull requests discovered: ${pullRequests.length}.`);
  }
  const [pullRequest] = pullRequests;

  const {data: statusResult} = await tools.github.graphql(`
    query CommitStatus($pullRequestID: ID!) {
      node(id: $pullRequestID) {
        ... on PullRequest {
          headRefOid
          commits(last: 1) {
            nodes {
              commit {
                checkSuites(first: 5) {
                  nodes {
                    app {
                      id
                    }
                    conclusion
                  }
                }
                status {
                  state
                }
              }
            }
          }
        }
      }
    }
  `, {
    pullRequestID: pullRequest,
  });

  if (statusResult.node.headRefOid !== commitOid) {
    tools.exit.neutral(`Pull request ${pullRequest} did not have a head ref oid matching ${commitOid}`);
  }

  const [commit] = statusResult.node.commits;

  // Exclude CodeCov because it publishes a QUEUED suite that never resolves
  const suites = commit.checkSuites.nodes.filter(n => n.app.id !== 'MDM6QXBwMjU0');

  if (!commit.status) {
    tools.exit.neutral(`Commit status has not been reported yet on ${commitOid}.`);
  }

  if (commit.status.state === 'SUCCESS' && suites.every(suite => suite.conclusion === 'SUCCESS')) {
    await tools.github.graphql(`
      mutation MergePullRequest($pullRequestID: ID!, $commitOid: GitObjectID!) {
        mergePullRequest(input: {pullRequestId: $pullRequestID, expectedHeadOid: $commitOid}) {
          pullRequest {
            id
          }
        }
      }
    `, {
      pullRequestID: pullRequest,
      commitOid,
    });
    tools.exit.success('Pull request has been merged.');
  }

  tools.exit.neutral('Declining to automatically merge pull request with failing checks.');
}, {
  event: ['check_suite.completed', 'status'],
  secrets: ['GITHUB_TOKEN'],
});
