workflow "GraphQL schema update" {
  // Every Wednesday at 1am.
  on = "schedule(0 1 * * 3)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}
