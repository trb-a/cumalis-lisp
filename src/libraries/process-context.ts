import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, create, createCS, defineBuiltInProcedure, forms } from "../utils";

// (command-line) process-context library procedure
// Note: Throws <error> if not running on Node.js
const commandLine = defineBuiltInProcedure("command-line", [
], () => {
  if (!process?.argv) {
    throw create.Error("error", "No process.argv (Maybe not running on Node.js)");
  }
  return create.List(...process.argv.map(v =>create.String(v, true)));
}, false, true);

// (exit) process-context library procedure
// (exit obj ) process-context library procedure
// transfer-cs root & call continuation & throw special
const exit = defineBuiltInProcedure("exit", [
  { name: "obj", type: "optional" },
], ({obj}, _itrp, stack) => {
  assertNonNull(stack);
  if (obj) {
    assert.Object(obj);
  }
  // Note: emergency-exit throw <#EXIT#> unconditionally.
  const expr = obj
    ? forms.CallBuiltIn("emergency-exit", create.MultiValue([obj]))
    : forms.CallBuiltIn("emergency-exit");
  const cont = create.Continuation(createCS(expr));
  return forms.Call(cont);
}, true, true);

// (emergency-exit) process-context library procedure
// (emergency-exit obj ) process-context library procedure
// Note: This doesn't do process.exit(), but throws <#EXIT#> object.
// Because cumalis-lisp is basically a npm module, users should handle
// it and do some finalization or wait for settlement of promises.
const emergencyExit = defineBuiltInProcedure("emergency-exit", [
  { name: "obj", type: "optional" },
], ({obj}) => {
  if (obj) {
    assert.Object(obj);
  }
  throw create.Exit(obj ?? null);
}, false, true);

// (get-environment-variable name) process-context library procedure
// Note: Throws <error> if process.env is not defined.
// Note: On windows, process.env is case-insensitive.
// https://nodejs.org/api/process.html#process_process_env
const getEnvironmentVariable = defineBuiltInProcedure("get-environment-variable", [
  { name: "name" },
], ({name}) => {
  assert.String(name);
  if (!process?.env) {
    throw create.Error("error", "No process.env (Maybe not running on Node.js)");
  }
  const value = process.env[name[1]];
  if (value) {
    return create.String(value, true);
  } else {
    return create.Boolean(false);
  }
}, false, true);

// (get-environment-variables) process-context library procedure
// Note: Throws <error> if process.env is not defined.
const getEnvironmentVariables = defineBuiltInProcedure("get-environment-variables", [
], () => {
  if (!process?.env) {
    throw create.Error("error", "No process.env (Maybe not running on Node.js)");
  }
  return create.List(...Object.keys(process.env).map(
    name => create.Pair(
      create.String(name, true),
      create.String(process.env[name] ?? "", true)
    )
  ));
}, false, true);

const procedures = [commandLine, exit, emergencyExit, getEnvironmentVariable, getEnvironmentVariables];
const ProcessContextLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default ProcessContextLibrary;
