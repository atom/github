workflow "GraphQL schema update" {
  // Every Thursday at 1am.
  on = "schedule(0 1 * * 4)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}
