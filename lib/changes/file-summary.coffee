class FileSummary
  constructor: ({@file, @status}) ->

  observe: (keys, fn) ->
    Object.observe @, (changes) =>
      for change in changes
        if change.name in keys
          fn(@)

module.exports = FileSummary
