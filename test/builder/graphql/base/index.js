// Danger! Danger! Metaprogramming bullshit ahead.

import {DeferredSpecBuilder} from './builder';
import {SpecRegistry} from './spec-registry';

export {createSpecBuilderClass} from './create-spec-builder';
export {createUnionBuilderClass} from './create-union-builder';
export {createConnectionBuilderClass} from './create-connection-builder';

// Resolve circular dependencies among SpecBuilder classes by replacing one of the imports with a defer() call. The
// deferred Builder it returns will lazily require and locate the linked builder at first use.
export function defer(modulePath, className) {
  return new DeferredSpecBuilder(modulePath, className);
}

let theRegistry = null;

// Access the One True spec registry, containing a map of every fragment in the package.
export async function getSpecRegistry() {
  if (theRegistry === null) {
    theRegistry = new SpecRegistry();
  }
  await theRegistry.ensurePopulated();
  return theRegistry;
}
