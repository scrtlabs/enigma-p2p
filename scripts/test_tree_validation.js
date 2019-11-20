const tree = require("../test/test_tree").TEST_TREE;
let topLevelKeys = Object.keys(tree);
let shouldPanic = false;
topLevelKeys.forEach(tk => {
  if (tree[tk].all === false) {
    console.log(`[ERROR] test_tree param ${tk} not true`);
    shouldPanic = true;
  }
  let localKeys = Object.keys(tk);
  localKeys.forEach(lk => {
    if (tree[tk]["#" + lk] === false) {
      console.log(`[ERROR] test_tree param ${tk}.#${lk} not true`);
      shouldPanic = true;
    }
  });
});

if (shouldPanic) {
  process.exit(1);
}
