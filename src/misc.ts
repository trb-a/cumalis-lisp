// Expantion procedures/syntaxes against R7RS.

import { assert, create, defineBuiltInProcedure, assertNonNull, parentCS } from "./utils";

const suspend = defineBuiltInProcedure("suspend", [
  { name: "obj", type: "optional" },
], ({ obj }, _itrp, stack) => {
  assertNonNull(stack);
  if (obj) {
    assert.Object(obj);
  }
  throw create.Suspend(
    create.Continuation(parentCS(stack)!),
    obj ?? create.Undefined()
  );
});

export const procedures = {
  suspend
};
