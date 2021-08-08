import type { BuiltInLibraryDefinition } from "../interpreter"
import { readFile } from "../misc";
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, create, defineBuiltInProcedure, forms } from "../utils";
import { interactionEnvironment } from "./repl";

// (load filename environment-specifier)
const load = defineBuiltInProcedure("load", [
  { name: "filename" },
  { name: "spec", type: "optional" },
], ({ filename, spec }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.String(filename);

  // Get enviroment specifier and port.
  if (spec) {
    assert.EnvironmentSpec(spec);
  } else {
    spec = interactionEnvironment.body()
  }

  // Read the file.
  const expr = readFile.body({ filename }, itrp);

  // finally evaluate the datum.
  return forms.CallBuiltIn("eval", expr, spec);
}, true, true);

const procedures = [load];
const LoadLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}
export default LoadLibrary;
