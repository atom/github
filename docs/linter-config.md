Recommended linter configuration is to use the `linter-eslint` and `atom-ide-ui` packages.  `linter-eslint` will prompt you to download `linter-ui-default` and other "dependencies" but that's not necessary if you're using `atom-ide-ui`.  These packages don't need any special configuration to work together - it should just happen automagically.

Recommended linter configuration settings:
- uncheck "use global eslint configuration" since the linter configuration lives in the project.
- check "fix errors on save"
