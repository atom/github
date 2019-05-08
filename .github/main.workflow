workflow "GraphQL schema update" {
  // Every Tuesday at 1am.
  on = "schedule(0 1 * * 2)"
  resolves = "Update schema"
}

workflow "Add issue to release board" {
  on = "issues"
  resolves = "Add issue to release board"
}

workflow "Add PR to release board" {
  on = "pull_request"
  resolves = "Add pull request to release board"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}

action "Issue assigned" {
  uses = "actions/bin/filter@master"
  args = "action assigned"
}

action "Add issue to release board" {
  needs = "Issue assigned"
  uses = "./actions/auto-sprint"
  secrets = ["GITHUB_TOKEN"]
}

action "Pull request opened, merged, or assigned" {
  uses = "actions/bin/filter@master"
  args = "action 'opened|merged|assigned'"
}

action "Add pull request to release board" {
  needs = "Pull request opened, merged, or assigned"
  uses = "./actions/auto-sprint"
  secrets = ["GITHUB_TOKEN"]
}
