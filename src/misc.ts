// Expantion procedures/syntaxes against R7RS.

import parser from "./parser";
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

// This is a utility procedure commonly used by
// "load", "include", "include-cli" and define-library",
// returns a begin expression.
export const readFile = defineBuiltInProcedure("read-file", [
  { name: "filename" },
  { name: "cli", type: "optional"}
], ({ filename, cli }, itrp) => {
  assertNonNull(itrp);
  assert.String(filename);
  if (cli) {
    assert.Boolean(cli);
  }
  if (!itrp?.fs) {
    throw create.Error("program-error", `No interpreter object or No Node.js "fs" object set on Interpreter.`);
  }
  let content;
  try {
    content = itrp.fs.readFileSync(filename[1]).toString();
  } catch {
    throw create.Error("read-error", `Can't read file from ${filename[1]}.`);
  }
  // Parse file
  let expr;
  try {
    expr = parser(
      (cli && cli[1]) ? "#!fold-case " + content : content,
      { filename: filename[1] }
    );
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("read-error", e.message);
    } else {
      throw create.Error("read-error", "Error occured while reading.");
    }
  }
  return expr;
}, false, true);

export const procedures = {
  suspend, readFile
};
