import type { BuiltInLibraryDefinition } from "../interpreter"
import { fromStringToTokens, fromTokensToTokenTrees, fromTokenTreeToObject } from "../parser";
import { readChar } from "../port";
import { Dictionary, LISP } from "../types";
import { fromTokensToString, fromTokenTreesToTokens } from "../unparser";
import { assert, assertNonNull, contentCS, create, defineBuiltInProcedure, is } from "../utils";

// Note: This procedure reads all the way to the end of the file and caches it.
// It does not stop at the end of a datum.
const read = defineBuiltInProcedure("read", [
  { name: "port", type: "optional" },
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (typeof port[5] !== "string") {
    throw create.Error("read-error", "Not a text port.")
  }
  let line = "";
  for (; ;) {
    const ret = readChar.body({ port }, itrp, stack) as LISP.Character;
    if (is.EndOfFile(ret)) {
       break;
    } else {
      line = line + ret[1];
    }
  }
  let trees, rest;
  try {
    const tokens = fromStringToTokens(line);
    [trees, rest] = fromTokensToTokenTrees(tokens);
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("read-error", e.message);
    } else {
      throw create.Error("read-error", "Error occured while reading.");
    }
  }
  if (trees.length === 0) {
    if (rest.length > 0) {
      throw create.Error("read-error", "The external representation is incomplete and therefore not parsable,");
    } else {
      return create.EndOfFile();
    }
  }
  const [first, ...others] = trees;
  const datum = fromTokenTreeToObject(first, null, { removeLineInfo: true });
  // Write back as a cache.
  const backTokens = fromTokenTreesToTokens(others);
  const backString = fromTokensToString(backTokens);
  port[5] = backString + port[5];
  // finally return the datum.
  return datum;
}, false, true);

const procedures = [read];
const ReadLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default ReadLibrary;
