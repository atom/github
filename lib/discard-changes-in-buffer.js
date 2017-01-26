export default function discardChangesInBuffer(buffer, filePatch, discardedLines) {
  // TODO: create buffer transaction
  // TODO: store of buffer for restoring in case of undo

  let addedCount = 0;
  let removedCount = 0;
  let deletedCount = 0;
  filePatch.getHunks().forEach(hunk => {
    hunk.getLines().forEach(line => {
      if (discardedLines.has(line)) {
        if (line.status === 'deleted') {
          const row = (line.oldLineNumber - deletedCount) + addedCount - removedCount - 1;
          buffer.insert([row, 0], line.text + '\n');
          addedCount++;
        } else if (line.status === 'added') {
          const row = line.newLineNumber + addedCount - removedCount - 1;
          if (buffer.lineForRow(row) === line.text) {
            buffer.deleteRow(row);
            removedCount++;
          } else {
            // eslint-disable-next-line no-console
            console.error(buffer.lineForRow(row) + ' does not match ' + line.text);
          }
        } else {
          throw new Error(`unrecognized status: ${line.status}. Must be 'added' or 'deleted'`);
        }
      }
      if (line.getStatus() === 'deleted') {
        deletedCount++;
      }
    });
  });

  buffer.save();
}
