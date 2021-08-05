import type { BuiltInLibraryDefinition } from "../interpreter"
import { Import } from "../structure";
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, contentCS, create, createCS, defineBuiltInProcedure, transferCS } from "../utils";

const environment = defineBuiltInProcedure("environment", [
  { name: "sets", type: "variadic" }
], ({ sets }, itrp, stack): LISP.Object => {
  assert.Objects(sets);
  assertNonNull(itrp);
  assertNonNull(stack);
  const tempStack = createCS(create.Undefined());
  Import.body({ sets }, itrp, tempStack);
  return create.EnvironmentSpec(contentCS(tempStack).env);
}, false, true);

// (eval expr-or-def environment-specifier)
const Eval = defineBuiltInProcedure("eval", [
  { name: "expr" },
  { name: "spec" },
], ({ expr, spec }, _itrp, stack) => {
  assert.Object(expr);
  assert.EnvironmentSpec(spec);
  assertNonNull(stack);
  return transferCS(stack, expr, { env: spec[1] });
}, false, true);

const procedures = [environment, Eval];
const EvalLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default EvalLibrary;


