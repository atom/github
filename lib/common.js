/** @babel */

module.exports = {
  DiffURI: 'atom://git-proto/diff/',

  createObjectsFromString: function (diffString, markerString, classToCreate) {
    let objects = []
    let lines = diffString.split('\n')
    let objectLines = null

    function createObject(lines) {
      if (!lines) return

      let obj = classToCreate.fromString(lines.join('\n'))
      objects.push(obj)
    }

    for (let line of lines) {
      if (line.startsWith(markerString)) {
        createObject(objectLines)
        objectLines = []
      }
      if (objectLines) objectLines.push(line)
    }
    createObject(objectLines)

    return objects
  }
}
