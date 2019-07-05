export const MAX_PATCH_CHARS = 10240;

export function filter(original, fileSet) {
  const removed = new Set();
  let accumulating = false;
  let accumulated = '';
  let includedChars = 0;

  let index = 0;
  const rx = /\n?diff --git (?:a|b)\/(\S+) (?:a|b)\/(\S+)\b/y;
  while (index !== -1) {
    let include = true;

    // Identify the files in the current patch. Exclude it if neither filename is in the accepted path set.
    const fileNames = [];
    rx.lastIndex = index;
    const m = rx.exec(original);
    if (m) {
      fileNames.push(m[1]);
      fileNames.push(m[2]);
    }

    if (!fileNames.some(fileName => fileSet.has(fileName))) {
      // Exclude this patch
      include = false;
    }

    const result = original.indexOf('\ndiff --git ', index);
    const nextIndex = result !== -1 ? result + 1 : -1;
    const patchEnd = nextIndex !== -1 ? nextIndex : original.length;

    // Exclude this patch if its inclusion would cause the patch to become too large.
    const patchChars = patchEnd - index + 1;
    if (includedChars + patchChars > MAX_PATCH_CHARS) {
      include = false;
    }

    if (include) {
      // Avoid copying large buffers of text around if we're including everything anyway.
      if (accumulating) {
        accumulated += original.slice(index, patchEnd);
      }
      includedChars += patchChars;
    } else {
      // If this is the first excluded patch, start by copying everything before this into "accumulated."
      if (!accumulating) {
        accumulating = true;
        accumulated = original.slice(0, index);
      }

      for (const fileName of fileNames) {
        removed.add(fileName);
      }
    }

    index = nextIndex;
  }

  return {filtered: accumulating ? accumulated : original, removed};
}
