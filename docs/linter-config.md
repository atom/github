Recommended linter configuration is to use the `linter-eslint` and `atom-ide-ui` packages.  `linter-eslint` will prompt you to download `linter-ui-default` and other "dependencies." Don't believe their lies, use atom-ide-ui instead.  These packages don't need any special configuration to work together - it should just happen automagically.

Recommended linter configuration settings:
- uncheck "use global eslint configuration" since the linter configuration lives in the project.
- check "fix errors on save"
