import type { BuiltInLibraryDefinition } from "../interpreter"
import { parser } from "../parser";
import { readChar } from "../port";
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, create, defineBuiltInProcedure, forms, is } from "../utils";
import { openInputFile } from "./file";
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
  const port = openInputFile.body({ str: filename}, itrp);

  // Slurp file.
  let line = "";
  for (; ;) {
    const ret = readChar.body({ port }, itrp, stack);
    if (is.EndOfFile(ret)) {
       break;
    } else {
      line = line + ret[1];
    }
  }
  // Parse file
  let datum;
  try {
    datum = parser(line, { filename: filename[1] });
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("read-error", e.message);
    } else {
      throw create.Error("read-error", "Error occured while reading.");
    }
  }
  // finally evaluate the datum.
  return forms.CallBuiltIn("eval", datum, spec);
}, true, true);

const procedures = [load];
const LoadLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}
export default LoadLibrary;
