workflow "GraphQL schema update" {
  on = "schedule(0 1 * * MON)"
  resolves = "Update schema"
}

action "Update schema" {
  uses = "./actions/schema-up"
  secrets = ["GITHUB_TOKEN"]
}

workflow "Schema update automerge: check suite" {
  on = "check_suite"
  resolves = "Automerge"
}

workflow "Schema update automerge: commit status" {
  on = "status"
  resolves = "Automerge"
}

action "Automerge" {
  uses = "./actions/schema-automerge"
  secrets = ["GITHUB_TOKEN"]
}
