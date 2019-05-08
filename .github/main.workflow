workflow "GraphQL schema update" {
  // Every Tuesday at 1am.
  on = "schedule(0 1 * * 2)"
  resolves = "Update schema"
}

workflow "Core team issues" {
  on = "issues"
  resolves = "Add issue to release board"
}

workflow "Core team pull requests" {
  on = "pull_request"
  resolves = "Add pull request to release board"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}

action "Consider issue for release board" {
  uses = "actions/bin/filter@master"
  args = "action assigned"
}

action "Add issue to release board" {
  needs = "Consider issue for release board"
  uses = "./actions/auto-sprint"
  secrets = ["GITHUB_TOKEN"]
}

action "Consider pull request for release board" {
  uses = "actions/bin/filter@master"
  args = "action 'opened|merged|assigned|reopened'"
}

action "Add pull request to release board" {
  needs = "Consider pull request for release board"
  uses = "./actions/auto-sprint"
  secrets = ["GRAPHQL_TOKEN"]
}
