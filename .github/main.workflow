workflow "GraphQL schema update" {
  // Every Tuesday at 1am.
  on = "schedule(0 1 * * 2)"
  resolves = "Update schema"
}

workflow "Add assigned issue to release board" {
  on = "issues"
  resolves = "Add to release board"
}

workflow "Add PR to release board" {
  on = "pull_request"
  resolves = "Add to release board"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}

action "Add to release board" {
  uses = "./actions/auto-sprint"
  secrets = ["GITHUB_TOKEN"]
}
