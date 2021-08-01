import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, contentCS, create, defineBuiltInProcedure, forms, is } from "../utils";

const delay = defineBuiltInProcedure("delay", [
  { name: "expr", evaluate: false },
], ({ expr }, _itrp, stack) => {
  assert.Object(expr);
  assertNonNull(stack);
  const proc = create.Procedure("lambda", [], expr, false, contentCS(stack).env);
  return create.Promise(proc, null);
}, false, true);

const delayForce = defineBuiltInProcedure("delay-force", [
  { name: "expr", evaluate: false },
], ({ expr }, _itrp, stack) => {
  assert.Object(expr);
  assertNonNull(stack);
  // delay
  const proc = create.Procedure("lambda", [], expr, false, contentCS(stack).env);
  const promise = create.Promise(proc, null);
  // force
  return forms.CallBuiltIn("force", promise);
}, true, true);

const force = defineBuiltInProcedure("force", [
  { name: "promise" },
], ({ promise }) => {
  assert.Object(promise);
  if (!is.Promise(promise)) {
    return forms.Quote(promise);
  } else if (promise[2]) {
    return forms.Quote(promise[2]);
  } else {
    const thunk = promise[1];
    if (!thunk) {
      throw create.Error("error", "Illegal promise.");
    }
    return forms.CallBuiltIn("force-1", promise, forms.Call(thunk));
  }
}, true, true);

const force1 = defineBuiltInProcedure("force-1", [
  { name: "promise" },
  { name: "obj" },
], ({ promise, obj }) => {
  assert.Promise(promise);
  assert.Object(obj);
  promise[2] = obj;
  return obj;
}, false, true);

const promiseQ = defineBuiltInProcedure("promise?", [
  { name: "obj" },
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Promise(obj));
}, false, true);

const makePromise = defineBuiltInProcedure("make-promise", [
  { name: "obj" },
], ({ obj }) => {
  assert.Object(obj);
  return create.Promise(null, obj)
}, false, true);

const procedures = [delay, delayForce, force, promiseQ, makePromise];
const supportProcedures = [force1];
const LazyLibrary: BuiltInLibraryDefinition = (itrp) => {
  [...procedures, ...supportProcedures].forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default LazyLibrary;


