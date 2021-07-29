// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.3. Booleans" are defined in this file.

import { assert, create, is, defineBuiltInProcedure } from "./utils";

const not = defineBuiltInProcedure("not", [
  { name: "obj" },
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.False(obj));
});

const booleanQ = defineBuiltInProcedure("boolean?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Boolean(obj));
});

const booleanEQ = defineBuiltInProcedure("boolean=?", [
  { name: "boolean1" },
  { name: "boolean2" },
  { name: "booleans", type: "variadic" },
], ({ boolean1, boolean2, booleans }) => {
  assert.Boolean(boolean1);
  assert.Boolean(boolean2);
  assert.Booleans(booleans);
  return create.Boolean([boolean2, ...booleans].every(b => b[1] === boolean1[1]));
});

export const procedures = {
  not, booleanQ, booleanEQ
};
