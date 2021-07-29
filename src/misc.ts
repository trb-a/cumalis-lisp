// Expantion procedures/syntaxes against R7RS.

import { assert, create, defineBuiltInProcedure, assertNonNull, parentCS } from "./utils";

const suspend = defineBuiltInProcedure("suspend", [
  { name: "obj" },
], ({ obj }, _itrp, stack) => {
  assert.Object(obj);
  assertNonNull(stack);
  throw create.Suspend(
    create.Continuation(parentCS(stack)!),
    obj
  );
});

export const procedures = {
  suspend
};
