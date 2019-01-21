import dedent from 'dedent-js';

const rawDiff = dedent`
  diff --git file.txt file.txt
  index 83db48f..bf269f4 100644
  --- file.txt
  +++ file.txt
  @@ -1,3 +1,3 @@ class Thing {
   line1
  -line2
  +new line
   line3
`;
const rawDiffWithPathPrefix = dedent`
  diff --git a/bad/path.txt b/bad/path.txt
  index af607bb..cfac420 100644
  --- a/bad/path.txt
  +++ b/bad/path.txt
  @@ -1,2 +1,3 @@
    line0
  -line1
  +line1.5
  +line2
`;
export {rawDiff, rawDiffWithPathPrefix};
