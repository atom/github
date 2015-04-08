module.exports = class Model
  observe: (keys, fn) ->
    Object.observe @, (changes) =>
      for change in changes
        if change.name in keys
          fn(@)
