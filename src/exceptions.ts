
// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.11. Exceptions" are defined in this file.

import { defineBuiltInProcedure, assert, create, is, assertNonNull, forms, contentCS, transferCS } from "./utils";

const withExceptionHandler = defineBuiltInProcedure("with-exception-handler", [
  { name: "handler" },
  { name: "thunk" },
], ({ handler, thunk }, _itrp, stack) => {
  assert.Procedure(handler);
  assert.Procedure(thunk);
  assertNonNull(stack);
  // Note: parent's handler will be kept on the handler stack.
  // We can transfer the call-stack instead of fork it.
  return transferCS(stack, forms.Call(thunk), {
    handler: create.HandlerStack(handler, contentCS(stack).handler)
  });
});

const raise = defineBuiltInProcedure("raise", [
  { name: "obj" }
], ({ obj }, _itrp, stack) => {
  assert.Object(obj);
  assertNonNull(stack);
  throw create.Exception(stack, obj, false);
});

const raiseContinuable = defineBuiltInProcedure("raise-continuable", [
  { name: "obj" }
], ({ obj }, _itrp, stack) => {
  assert.Object(obj);
  assertNonNull(stack);
  throw create.Exception(stack, obj, true);
});

const error = defineBuiltInProcedure("error", [
  { name: "message" },
  { name: "objs", type: "variadic" }
], ({ message, objs }, _itrp, stack) => {
  assert.String(message);
  assert.Objects(objs);
  assertNonNull(stack);
  throw create.Exception(stack, create.Error("error", message[1], objs), true);
});

const errorObjectQ = defineBuiltInProcedure("error-object?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Error(obj));
});

const errorObjectMessage = defineBuiltInProcedure("error-object-message", [
  { name: "err" }
], ({ err }) => {
  assert.Error(err);
  return create.String(err[2] ?? err[1], false);
});

const errorObjectIrritants = defineBuiltInProcedure("error-object-irritants", [
  { name: "err" }
], ({ err }) => {
  assert.Error(err);
  return create.List(...err[3]);
});

const readErrorQ = defineBuiltInProcedure("read-error?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Error(obj) && obj[1] === "read-error");
});

const fileErrorQ = defineBuiltInProcedure("file-error?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Error(obj) && obj[1] === "file-error");
});

export const procedures = {
  withExceptionHandler, raise, raiseContinuable, error,
  errorObjectQ, errorObjectMessage, errorObjectIrritants, readErrorQ, fileErrorQ,
};
