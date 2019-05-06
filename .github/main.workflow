workflow "GraphQL schema update" {
  // Every Tuesday at 1am.
  on = "schedule(0 2 * * 1)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}
