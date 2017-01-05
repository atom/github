module.exports = function({types: t, template}) {
  const generator = template(`
    until(fail => {
      try {
        ASSERT_CALL;
        return true;
      } catch (err) {
        return fail(err);
      }
    })
  `);

  return {
    name: 'assert-async',
    visitor: {
      CallExpression(path) {
        const callee = path.node.callee;
        if (!t.isMemberExpression(callee)) { return; }
        const calleeObject = callee.object;
        if (!t.isMemberExpression(calleeObject)) { return; }

        const calleeObjectObject = calleeObject.object;
        const calleeObjectProperty = calleeObject.property;

        if (calleeObjectObject.name !== 'assert') { return; }
        if (t.isIdentifier(calleeObjectProperty) && calleeObjectProperty.name !== 'async') { return; }

        // path === assert.async.something(arg1, arg2)

        // [arg1, arg2]
        const callArgs = path.node.arguments;

        // "assert"
        const assert = calleeObject.object.name;
        // "something"
        const meth = callee.property.name;

        // assert.something
        const assertDotMethod = t.memberExpression(t.identifier(assert), t.identifier(meth));
        // assert.something(arg1, arg2)
        const assertExpression = t.callExpression(assertDotMethod, callArgs);

        path.replaceWith(generator({ASSERT_CALL: assertExpression}));
      },
    },
  };
};
