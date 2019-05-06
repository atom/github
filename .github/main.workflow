workflow "GraphQL schema update" {
  // Every Tuesday at 1am.
  on = "schedule(0 1 * * 2)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}
