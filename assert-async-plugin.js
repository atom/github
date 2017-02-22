module.exports = function({types: t, template}) {
  const generator = template(`
    UNTIL_FUNC(async fail => {
      try {
        ASSERT_CALL;
        return true;
      } catch (err) {
        return fail(err);
      }
    }, UNTIL_ARGS)
  `);

  return {
    name: 'assert-async',
    visitor: {
      CallExpression(path, state) {
        // assuming `assert.async.something(arg1, arg2)`

        // assert.async.something
        const callee = path.node.callee;
        if (!t.isMemberExpression(callee)) { return; }
        // assert.async
        let calleeObject = callee.object;
        let asyncArgs = [];
        // support `assert.async(200).something(arg1, arg2)` for setting timeout
        // in this case, `calleeObject` is actually `assert.async(200)` not `assert.async`
        if (t.isCallExpression(calleeObject)) {
          asyncArgs = calleeObject.arguments; // [200]
          calleeObject = calleeObject.callee; // assert.async
        }
        if (!t.isMemberExpression(calleeObject)) { return; }

        const calleeObjectObject = calleeObject.object;
        const calleeObjectProperty = calleeObject.property;

        if (!t.isIdentifier(calleeObjectObject) || calleeObjectObject.name !== 'assert') { return; }
        if (!t.isIdentifier(calleeObjectProperty) || calleeObjectProperty.name !== 'async') { return; }

        // path === assert.async.something(arg1, arg2)

        // [arg1, arg2]
        const callArgs = path.node.arguments;

        // "assert"
        const assert = calleeObject.object.name;
        // "something"
        const meth = callee.property.name;

        if (t.isExpressionStatement(path.parent)) {
          const error = `${assert}.async.${meth} can not be used as a statement (did you forget to 'await' it?)`;
          throw path.buildCodeFrameError(error);
        }

        // assert.something
        const assertDotMethod = t.memberExpression(t.identifier(assert), t.identifier(meth));
        // assert.something(arg1, arg2)
        const assertExpression = t.callExpression(assertDotMethod, callArgs);

        path.replaceWith(generator({
          ASSERT_CALL: assertExpression,
          UNTIL_ARGS: asyncArgs,
          UNTIL_FUNC: state.addImport('test-until', 'default', 'until'),
        }));
      },
    },
  };
};
