workflow "GraphQL schema update" {
  on = "schedule(0 1 * * 1)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}
