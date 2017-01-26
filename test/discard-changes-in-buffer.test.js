import path from 'path';
import fs from 'fs';

import {TextBuffer} from 'atom';

import {cloneRepository, buildRepository} from './helpers';
import discardChangesInBuffer from '../lib/discard-changes-in-buffer';

const getHunkLinesForPatch = filePatch => {
  return filePatch.getHunks().reduce((acc, hunk) => {
    return acc.concat(hunk.getLines().filter(l => l.isChanged()));
  }, []);
};

describe('discardChangesInBuffer', () => {
  let buffer, repository, filePath;
  beforeEach(async () => {
    const workdirPath = await cloneRepository('multi-line-file');
    repository = await buildRepository(workdirPath);
    filePath = path.join(workdirPath, 'sample.js');
    buffer = new TextBuffer({filePath, load: true});
    await new Promise(resolve => {
      const disposable = buffer.onDidReload(() => {
        disposable.dispose();
        resolve();
      });
    });
  });

  it('discards added lines', async () => {
    const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');
    const unstagedLines = originalLines.slice();
    unstagedLines.splice(1, 0, 'a', 'b');
    fs.writeFileSync(filePath, unstagedLines.join('\n'));

    // discard non-first line
    const unstagedFilePatch1 = await repository.getFilePatchForPath('sample.js');
    let addedLine = getHunkLinesForPatch(unstagedFilePatch1)[1];
    discardChangesInBuffer(buffer, unstagedFilePatch1, new Set([addedLine]));
    let remainingLines = unstagedLines.filter(l => l !== addedLine.getText());
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), remainingLines.join('\n'));

    // discard first line
    const unstagedFilePatch2 = await repository.getFilePatchForPath('sample.js');
    addedLine = getHunkLinesForPatch(unstagedFilePatch2)[0];
    discardChangesInBuffer(buffer, unstagedFilePatch2, new Set([addedLine]));
    remainingLines = remainingLines.filter(text => text !== addedLine.getText());
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath), remainingLines.join('\n'));

    remainingLines.splice(5, 0, 'c', 'd', 'e');
    fs.writeFileSync(filePath, remainingLines.join('\n'));

    // discard multiple lines
    const unstagedFilePatch3 = await repository.getFilePatchForPath('sample.js');
    const addedLines = getHunkLinesForPatch(unstagedFilePatch3).slice(1, 3);
    discardChangesInBuffer(buffer, unstagedFilePatch3, new Set(addedLines));
    remainingLines = remainingLines.filter(text => !addedLines.map(l => l.getText()).includes(text));
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), remainingLines.join('\n'));
  });

  it('discards deleted lines', async () => {
    const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');
    const unstagedLines = originalLines.slice();
    let deletedTextLines = unstagedLines.splice(1, 2);
    fs.writeFileSync(filePath, unstagedLines.join('\n'));

    // discard non-first line
    const unstagedFilePatch1 = await repository.getFilePatchForPath('sample.js');
    let deletedLine = getHunkLinesForPatch(unstagedFilePatch1)[1];
    discardChangesInBuffer(buffer, unstagedFilePatch1, new Set([deletedLine]));
    unstagedLines.splice(1, 0, deletedTextLines[1]);
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), unstagedLines.join('\n'));

    // discard first line
    const unstagedFilePatch2 = await repository.getFilePatchForPath('sample.js');
    deletedLine = getHunkLinesForPatch(unstagedFilePatch2)[0];
    discardChangesInBuffer(buffer, unstagedFilePatch2, new Set([deletedLine]));
    unstagedLines.splice(1, 0, deletedTextLines[0]);
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath), unstagedLines.join('\n'));

    deletedTextLines = unstagedLines.splice(5, 3);
    fs.writeFileSync(filePath, unstagedLines.join('\n'));

    // discard multiple lines
    const unstagedFilePatch3 = await repository.getFilePatchForPath('sample.js');
    const deletedLines = getHunkLinesForPatch(unstagedFilePatch3).slice(1, 3);
    discardChangesInBuffer(buffer, unstagedFilePatch3, new Set(deletedLines));
    unstagedLines.splice(5, 0, ...deletedTextLines.slice(1, 3));
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), unstagedLines.join('\n'));
  });

  it('discards added and deleted lines together', async () => {
    const originalLines = fs.readFileSync(filePath, 'utf8').split('\n');
    const unstagedLines = originalLines.slice();
    let deletedTextLines = unstagedLines.splice(1, 2, 'one modified line', 'another modified line');
    fs.writeFileSync(filePath, unstagedLines.join('\n'));

    const unstagedFilePatch1 = await repository.getFilePatchForPath('sample.js');
    const hunkLines = getHunkLinesForPatch(unstagedFilePatch1);
    let deletedLine = hunkLines[1];
    let addedLine = hunkLines[3];
    discardChangesInBuffer(buffer, unstagedFilePatch1, new Set([deletedLine, addedLine]));
    unstagedLines.splice(1, 0, deletedTextLines[1]);
    let remainingLines = unstagedLines.filter(l => l !== addedLine.getText());
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), remainingLines.join('\n'));

    const unstagedFilePatch2 = await repository.getFilePatchForPath('sample.js');
    [deletedLine, addedLine] = getHunkLinesForPatch(unstagedFilePatch2);
    discardChangesInBuffer(buffer, unstagedFilePatch2, new Set([deletedLine, addedLine]));
    remainingLines.splice(1, 0, deletedTextLines[0]);
    remainingLines = remainingLines.filter(l => l !== addedLine.getText());
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), remainingLines.join('\n'));

    deletedTextLines = remainingLines.splice(5, 3, 'a', 'b', 'c');
    fs.writeFileSync(filePath, remainingLines.join('\n'));

    const unstagedFilePatch3 = await repository.getFilePatchForPath('sample.js');
    // discard last two deletions and first addition
    const linesToDiscard = getHunkLinesForPatch(unstagedFilePatch3).slice(1, 4);
    discardChangesInBuffer(buffer, unstagedFilePatch3, new Set(linesToDiscard));
    remainingLines.splice(5, 0, ...deletedTextLines.slice(1, 3));
    remainingLines = remainingLines.filter(l => l !== linesToDiscard[2].getText());
    await new Promise(r => setTimeout(r, 100));
    await repository.refresh();
    assert.equal(fs.readFileSync(filePath, 'utf8'), remainingLines.join('\n'));
  });
});
