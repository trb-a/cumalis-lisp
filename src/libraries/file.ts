import type { BuiltInLibraryDefinition } from "../interpreter"
import { closePort } from "../port";
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, create, defineBuiltInProcedure, forms } from "../utils";

const fsMessage = `"fs" is not set. To use filesystems, import/require "fs" and set it on Interpreter's constructor parameter.`;

// Support function for call-with-input-file, call-with-output-file,
// with-input-from-file, with-output-to-file.
// After evaluating obj, close the port, finally returns evaluated value of obj.
const evalClose = defineBuiltInProcedure("eval-close", [
  { name: "obj" },
  { name: "port" },
], ({ obj, port }, itrp) => {
  assert.Object(obj);
  assert.Port(port);
  assertNonNull(itrp);
  closePort.body({port}, itrp);
  return obj;
}, false, true);

// (call-with-input-file string proc) file library procedure
const callWithInputFile = defineBuiltInProcedure("call-with-input-file", [
  { name: "str" },
  { name: "proc" }
], ({ str, proc }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);
  assert.Procedure(proc);

  const port = openInputFile.body({ str }, itrp);
  return forms.CallBuiltIn("eval-close",
    forms.Call(proc, port),
    port,
  );
}, true, true);

// (call-with-output-file string proc) file library procedure
const callWithOutputFile = defineBuiltInProcedure("call-with-output-file", [
  { name: "str" },
  { name: "proc" }
], ({ str, proc }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);
  assert.Procedure(proc);

  const port = openOutputFile.body({ str }, itrp);
  return forms.CallBuiltIn("eval-close",
    forms.Call(proc, port),
    port,
  );
}, true, true);

// (with-input-from-file string thunk) file library procedure
const withInputFromFile = defineBuiltInProcedure("with-input-from-file", [
  { name: "str" },
  { name: "thunk" }
], ({ str, thunk }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);
  assert.Procedure(thunk);

  const port = openInputFile.body({ str }, itrp);

  return forms.CallBuiltIn("parameterize",
    create.List(
      create.List(create.Symbol("current-input-port"), port)
    ),
    forms.CallBuiltIn("eval-close",
      forms.Call(thunk),
      port,
    )
  );
}, true, true);

// (with-output-to-file string thunk) file library procedure
const withOutputToFile = defineBuiltInProcedure("with-output-to-file", [
  { name: "str" },
  { name: "thunk" }
], ({ str, thunk }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);
  assert.Procedure(thunk);

  const port = openOutputFile.body({ str }, itrp);

  return forms.CallBuiltIn("parameterize",
    create.List(
      create.List(create.Symbol("current-output-port"), port)
    ),
    forms.CallBuiltIn("eval-close",
      forms.Call(thunk),
      port,
    )
  );
}, true, true);

// (open-input-file string) file library procedure
const openInputFile = defineBuiltInProcedure("open-input-file", [
  { name: "str" }
], ({ str }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);

  const bp = itrp.getBuiltInPort(str[1]);
  if (bp) {
    try {
      bp.open?.("r", null);
      return create.Port("built-in", str[1], "r", null, "");
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `built-in port "${str[1]} open("r") failed.`);
      }
    }
  } else {
    try {
      const fd = fs.openSync(str[1], "r");
      return create.Port("file", fd, "r", null, "");
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `fs.openSync("${str[1]}", "r") failed.`);
      }
    }
  }

}, false, true);

// (open-binary-input-file string) file library procedure
const openBinaryInputFile = defineBuiltInProcedure("open-binary-input-file", [
  { name: "str" }
], ({ str }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);

  const bp = itrp.getBuiltInPort(str[1]);
  if (bp) {
    try {
      bp.open?.("r", null);
      return create.Port("built-in", str[1], "r", null, []);
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `built-in port "${str[1]} open("r") failed.`);
      }
    }
  } else {
    try {
      const fd = fs.openSync(str[1], "r");
      return create.Port("file", fd, "r", null, []);
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `fs.openSync("${str[1]}", "r") failed.`);
      }
    }
  }
}, false, true);

// (open-output-file string) file library procedure
const openOutputFile = defineBuiltInProcedure("open-output-file", [
  { name: "str" }
], ({ str }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);

  const bp = itrp.getBuiltInPort(str[1]);
  if (bp) {
    try {
      bp.open?.("w", null);
      return create.Port("built-in", str[1], "w", null, "");
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `built-in port "${str[1]} open("w") failed.`);
      }
    }
  } else {
    try {
      const fd = fs.openSync(str[1], "w");
      return create.Port("file", fd, "w", null, "");
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `fs.openSync("${str[1]}", "w") failed.`);
      }
    }
  }
}, false, true);

// (open-binary-output-file string) file library procedure
const openBinaryOutputFile = defineBuiltInProcedure("open-binary-output-file", [
  { name: "str" }
], ({ str }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(str);

  const bp = itrp.getBuiltInPort(str[1]);
  if (bp) {
    try {
      bp.open?.("w", null);
      return create.Port("built-in", str[1], "w", null, []);
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `built-in port "${str[1]} open("w") failed.`);
      }
    }
  } else {
    try {
      const fd = fs.openSync(str[1], "w");
      return create.Port("file", fd, "w", null, []);
    } catch (e) {
      if (e instanceof Error) {
        throw create.Error("file-error", e.message);
      } else {
        throw create.Error("file-error", `fs.openSync("${str[1]}", "w") failed.`);
      }
    }
  }
}, false, true);

// (file-exists? filename) file library procedure
const fileExistsQ = defineBuiltInProcedure("file-exists?", [
  { name: "filename" }
], ({ filename }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(filename);

  try {
    return create.Boolean(fs.existsSync(filename[1]));
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("file-error", e.message);
    } else {
      throw create.Error("file-error", "fs.existsSync() failed.");
    }
  }
}, false, true);

// (delete-file filename) file library procedure
const deleteFile = defineBuiltInProcedure("delete-file", [
  { name: "filename" }
], ({ filename }, itrp) => {
  assertNonNull(itrp);
  const fs = itrp.getOptions().fs;
  assertNonNull(fs, fsMessage);

  assert.String(filename);

  try {
    fs.unlinkSync(filename[1]);
  } catch (e) {
    if (e instanceof Error) {
      throw create.Error("file-error", e.message);
    } else {
      throw create.Error("file-error", "fs.unlinkSync() failed.");
    }
  }

  return create.Undefined();
}, false, true);

const procedures = [
  callWithInputFile, callWithOutputFile, withInputFromFile, withOutputToFile,
  openInputFile, openBinaryInputFile, openOutputFile, openBinaryOutputFile,
  fileExistsQ, deleteFile
];
const supportProcedures = [evalClose];
const FileLibrary: BuiltInLibraryDefinition = (itrp) => {
  [...procedures, ...supportProcedures].forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}
export default FileLibrary;
