import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { fromObjectToTokenTree, fromTokensToString, fromTokenTreesToTokens } from "../unparser";
import { assert, create, defineBuiltInProcedure, forms } from "../utils";

const write = defineBuiltInProcedure("write", [
  { name: "obj" },
  { name: "port", type: "optional" },
], ({ obj, port }) => {
  assert.Object(obj);
  if (port) {
    assert.Object(port);
  }
  let str: string;
  try {
    str = fromTokensToString(
      fromTokenTreesToTokens([
        fromObjectToTokenTree(obj)
      ])
    );
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("write-error", e.message);
    }
    throw e;
  }
  return port
    ? forms.CallBuiltIn("write-string", create.String(str, false), port)
    : forms.CallBuiltIn("write-string", create.String(str, false))
}, true, true);

const writeShared = defineBuiltInProcedure("write-shared", [
  { name: "obj" },
  { name: "port", type: "optional" },
], ({ obj, port }) => {
  assert.Object(obj);
  if (port) {
    assert.Object(port);
  }
  let str: string;
  try {
    str = fromTokensToString(
      fromTokenTreesToTokens([
        fromObjectToTokenTree(obj, { labels: "shared" })
      ])
    );
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("write-error", e.message);
    }
    throw e;
  }
  return port
    ? forms.CallBuiltIn("write-string", create.String(str, false), port)
    : forms.CallBuiltIn("write-string", create.String(str, false))
}, true, true);

const writeSimple = defineBuiltInProcedure("write-simple", [
  { name: "obj" },
  { name: "port", type: "optional" },
], ({ obj, port }) => {
  assert.Object(obj);
  if (port) {
    assert.Object(port);
  }
  let str: string;
  try {
    str = fromTokensToString(
      fromTokenTreesToTokens([
        fromObjectToTokenTree(obj, { labels: "simple" })
      ])
    );
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("write-error", e.message);
    }
    throw e;
  }
  return port
    ? forms.CallBuiltIn("write-string", create.String(str, false), port)
    : forms.CallBuiltIn("write-string", create.String(str, false))
}, true, true);

const display = defineBuiltInProcedure("display", [
  { name: "obj" },
  { name: "port", type: "optional" },
], ({ obj, port }) => {
  assert.Object(obj);
  if (port) {
    assert.Object(port);
  }
  let str: string;
  try {
    str = fromTokensToString(
      fromTokenTreesToTokens([
        fromObjectToTokenTree(obj, { style: "display"})
      ])
    );
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("write-error", e.message);
    }
    throw e;
  }
  return port
    ? forms.CallBuiltIn("write-string", create.String(str, false), port)
    : forms.CallBuiltIn("write-string", create.String(str, false))
}, true, true);

const procedures = [write, writeShared, writeSimple, display];
const WriteLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default WriteLibrary;


