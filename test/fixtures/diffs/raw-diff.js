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
export default rawDiff;
