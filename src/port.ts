/* eslint-disable @typescript-eslint/no-var-requires */
// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.13. Input and output" are defined in this file.

import { LISP } from "./types";
import { defineBuiltInProcedure, assert, create, is, forms, assertNonNull, contentCS } from "./utils";

const fsMessage = `"fs" is not set. To use filesystems, import/require "fs" and set it on Interpreter's constructor parameter.`;

const callWithPort = defineBuiltInProcedure("call-with-port", [
  { name: "port" },
  { name: "proc" }
], ({ port, proc }) => {
  assert.Port(port);
  assert.Procedure(proc);
  return forms.Begin(
    forms.Call(proc, port),
    forms.CallBuiltIn("close-port", port),
  );
});

// (call-with-input-file string proc) file library procedure

// (call-with-output-file string proc) file library procedure

const inputPortQ = defineBuiltInProcedure("input-port?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(!!(is.Port(obj) && obj[3]?.includes("r")));
});

const outputPortQ = defineBuiltInProcedure("output-port?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(!!(is.Port(obj) && obj[3]?.includes("w")));
});

const textualPortQ = defineBuiltInProcedure("textual-port?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Port(obj) && typeof obj[5] === "string");
});

const binaryPortQ = defineBuiltInProcedure("binary-port?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Port(obj) && typeof obj[5] !== "string");
});

const portQ = defineBuiltInProcedure("port?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Port(obj));
});

const inputPortOpenQ = defineBuiltInProcedure("input-port-open?", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  return create.Boolean(!!port[3]?.includes("r"));
});

const outputPortOpenQ = defineBuiltInProcedure("output-port-open?", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  return create.Boolean(!!port[3]?.includes("w"));
});

// current-input-port/current-output-port/current-error-port are
// built-in static/dynamic variables.

// (with-input-from-file string thunk) file library procedure

// (with-output-to-file string thunk) file library procedure

// (open-input-file string) file library procedure

// (open-binary-input-file string) file library procedure

// (open-output-file string) file library procedure

// (open-binary-output-file string) file library procedure

export const closePort = defineBuiltInProcedure("close-port", [
  { name: "port" }
], ({ port }, itrp) => {
  assert.Port(port);
  if (!port[3]) {
    return ["<undefined>"];
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip) {
      throw create.Error("program-error", `Illegal built-in file object.`);
    }
    bip.close?.();
  } else if (port[1] === "string") {
    // Nothing to do;
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("program-error", `No interpreter object or No Node.js "fs" object set on Interpreter.`);
    }
    itrp.fs.closeSync(port[2]);
    return create.Boolean(true); // Can be
  } else {
    throw create.Error("program-error", `Unknown port type "${port[1]}"`);
  }
  port[3] = null;
  return ["<undefined>"];
});

const closeInputPort = defineBuiltInProcedure("close-input-port", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  if (!port[3]?.includes("r")) {
    return ["<undefined>"];
  }
  if (port[1] === "built-in") {
    throw create.Error("program-error", `Can't close only output port for built-in port.`);
  } else if (port[1] === "string") {
    // Nothing to do;
  } else if (port[1] === "bytevector") {
    // Nothing to do;
  } else if (port[1] === "file") {
    throw create.Error("program-error", `Can't close only input port for file port.`);
  } else {
    throw create.Error("program-error", `Unknown port type "${port[1]}"`);
  }
  port[3] = port[3]!.replace("r", "") as any || null;
  return ["<undefined>"];
});

const closeOutputPort = defineBuiltInProcedure("close-output-port", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  if (!port[3]?.includes("w")) {
    return ["<undefined>"];
  }
  if (port[1] === "built-in") {
    throw create.Error("program-error", `Can't close only output port for built-in port.`);
  } else if (port[1] === "string") {
    // Nothing to do;
  } else if (port[1] === "bytevector") {
    // Nothing to do;
  } else if (port[1] === "file") {
    throw create.Error("program-error", `Can't close only output port for file port.`);
  } else {
    throw create.Error("program-error", `Unknown port type "${port[1]}"`);
  }
  port[3] = port[3]!.replace("w", "") as any || null;
  return ["<undefined>"];
});

const openInputString = defineBuiltInProcedure("open-input-string", [
  { name: "str" }
], ({ str }) => {
  assert.String(str);
  return create.Port("string", str[1], "r", null, "");
});

const openOutputString = defineBuiltInProcedure("open-output-string", [
], () => {
  return create.Port("string", "", "w", null, "");
});

const getOutputString = defineBuiltInProcedure("get-output-string", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  if (port[1] !== "string" || !port[3]?.includes("w")) {
    throw create.Error("read-error", "Not a port created by open-output-string.")
  }
  return create.String(port[2], false)
});

const openInputBytevector = defineBuiltInProcedure("open-input-bytevector", [
  { name: "bvec" }
], ({ bvec }) => {
  assert.ByteVector(bvec);
  return create.Port("bytevector", [...bvec[1]], "r", null, []);
});

const openOutputBytevector = defineBuiltInProcedure("open-output-bytevector", [
], () => {
  return create.Port("bytevector", [], "w", null, []);
});

const getOutputBytevector = defineBuiltInProcedure("get-output-bytevector", [
  { name: "port" }
], ({ port }) => {
  assert.Port(port);
  if (port[1] !== "bytevector" || !port[3]?.includes("w")) {
    throw create.Error("read-error", "Not a port created by open-output-string.")
  }
  return create.ByteVector([...port[2]], false)
});

// (read) read library procedure

// (read port) read library procedure

export const readChar = defineBuiltInProcedure("read-char", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack): LISP.Character | LISP.EndOfFile => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("r")) {
    throw create.Error("read-error", "Port is not open.")
  }
  if (typeof port[5] !== "string") {
    throw create.Error("read-error", "Not a text port.")
  }
  let ret: string | number | null | undefined = undefined;
  if (port[5].length > 0) {
    // Note: It is assumed that there isn't half surrogate pair.
    if (/^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(port[5])) { // surrogate pair
      ret = port[5].slice(0, 2);
      port[5] = port[5].slice(2);
    } else {
      ret = port[5].slice(0, 1);
      port[5] = port[5].slice(1);
    }
  } else if (port[1] === "built-in") {
    const bip = itrp?.getBuiltInPort(port[2]);
    ret = bip?.read?.("character", null);
  } else if (port[1] === "string") {
    // Note: the string might be very long.
    // Don't convert the string to Array using Array.from.
    if (port[2].length === 0) {
      ret = null;
    } else if (/^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(port[2])) { // surrogate pair
      ret = port[2].slice(0, 2);
      port[2] = port[2].slice(2);
    } else {
      ret = port[2].slice(0, 1);
      port[2] = port[2].slice(1);
    }
  // } else if (port[1] === "bytevector") {
  //   // Not a text port
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("read-error", fsMessage);
    }
    // Try to read a complete UTF-8 character.
    // Note: this may block!
    const buffer = Buffer.alloc(4);
    for (let i = 0; ; i++) {
      // Note: blocks until read complete according to the Node.js document.
      // https://nodejs.org/api/fs.html#fs_synchronous_api
      const bytes = itrp.fs.readSync(port[2], buffer, {
        length: 1, offset: i
      });
      if (!bytes) {
        ret = null; // EOF
        break;
      }
      const str = buffer.toString("utf8", 0, i + 1);
      if (!str.includes("\ufffd")) {
        ret = str;
        break;
      }
      if (i >= 4) {
        throw create.Error("read-error", "Not a valid text(UTF-8) file.");
      }
    }
  } else {
    throw create.Error("program-error", "Illegal type of port.")
  }
  if (ret === null) {
    return create.EndOfFile();
  } else if (ret === undefined) {
    throw create.Error("read-error", null);
  } else if (typeof ret !== "string") {
    throw create.Error("read-error", "Read-data is not a expected format (number).");
  } else {
    return create.Character(ret);
  }
});

const peekChar = defineBuiltInProcedure("peek-char", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  const ret = readChar.body({ port }, itrp, stack) as LISP.Character | LISP.EndOfFile;
  if (!is.EndOfFile(ret)) {
    port[5] = typeof port[5] === "string" ? ret[1] + port[5] : ret[1];
  }
  return ret;
});

const readLine = defineBuiltInProcedure("read-line", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  let line = "";
  for (; ;) {
    const ret = readChar.body({ port }, itrp, stack);
    if (is.EndOfFile(ret)) {
      if (line === "") {
        return ret;
      } else {
        return create.String(line, false);
      }
    } else if (ret[1] === "\r") {
      const next = readChar.body({ port }, itrp, stack);
      if (is.EndOfFile(next)) {
        return create.String(line, false);
      } else if (next[1] === "\n") {
        return create.String(line, false);
      } else {
        port[5] = typeof port[5] === "string" ? next[1] + port[5] : next[1];
        return create.String(line, false);
      }
    } else if (ret[1] === "\n") {
      return create.String(line, false);
    } else {
      line = line + ret[1];
    }
  }
});

const eofObjectQ = defineBuiltInProcedure("eof-object?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.EndOfFile(obj));
});

const eofObject = defineBuiltInProcedure("eof-object", [
], () => {
  return create.EndOfFile();
});

// Note: No way to check ready for readSync on Node.js
// Node.js has fstat, but doesn't have ftell(3) equivalent.
// No way to say "ready" for reading.
const charReadyQ = defineBuiltInProcedure("char-ready?", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("r")) {
    return create.Boolean(false);
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip) {
      throw create.Error("program-error", `Illegal built-in file object.`);
    }
    return create.Boolean(!!bip.ready?.());
  } else if (port[1] === "string") {
    return create.Boolean(true); // Note: even if EOF, returns true.
  } else if (port[1] === "bytevector") {
    return create.Boolean(false);
  } else if (port[1] === "file") {
    // Node.js has fstat, but doesn't have ftell(3) equivalent.
    // No way to say "ready" for reading.
    throw create.Error("program-error", `"Node.js file "ready" method is not implemented."`);
  } else {
    throw create.Error("program-error", `Unknown port type "${port[1]}"`);
  }
});

const readString = defineBuiltInProcedure("read-string", [
  { name: "k" },
  { name: "port", type: "optional" }
], ({ k, port }, itrp, stack) => {
  assert.IntegerNumber(k);
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  let line = "";
  for (; ;) {
    const ret = readChar.body({ port }, itrp, stack) as LISP.Character;
    if (is.EndOfFile(ret)) {
      if (line.length === 0) {
        return ret;
      } else {
        return create.String(line, false);
      }
    } else {
      line = line + ret[1];
      if (line.length >= k[1]) {
        return create.String(line, false);
      }
    }
  }
});

const readU8 = defineBuiltInProcedure("read-u8", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack): LISP.Number | LISP.EndOfFile => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("r")) {
    throw create.Error("read-error", "Port is not open.")
  }
  if (typeof port[5] === "string") {
    throw create.Error("read-error", "Not a binary port.")
  }
  let ret: string | number | null | undefined = undefined;
  if (port[5].length > 0) {
    ret = port[5][0];
    port[5] = port[5].slice(1);
  } else if (port[1] === "built-in") {
    const bip = itrp?.getBuiltInPort(port[2]);
    ret = bip?.read?.("byte", null);
    // } else if (port[1] === "string") {
    // Not a binary port
  } else if (port[1] === "bytevector") {
    if (port[2].length > 0) {
      ret = port[2][0];
      port[2] = port[2].slice(1);
    } else {
      ret = null;
    }
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("read-error", fsMessage);
    }
    const buffer = Buffer.alloc(1);
    const bytes = itrp.fs.readSync(port[2], buffer);
    if (!bytes) {
      ret = null; // EOF
    } else {
      ret = buffer[0];
    }
  } else {
    throw create.Error("program-error", "Illegal type of port.");
  }
  if (ret === null) {
    return create.EndOfFile();
  } else if (ret === undefined) {
    throw create.Error("read-error", null);
  } else if (typeof ret !== "number") {
    throw create.Error("read-error", "Read-data is not a expected format (string).");
  } else {
    return create.Number(ret);
  }
});

const peekU8 = defineBuiltInProcedure("peek-u8", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  const ret = readU8.body({ port }, itrp, stack) as LISP.RealNumber | LISP.EndOfFile;
  if (!is.EndOfFile(ret)) {
    port[5] = typeof port[5] !== "string" ? [ret[1], ...port[5]] : [ret[1]];
  }
  return ret;
});

const u8ReadyQ = defineBuiltInProcedure("u8-ready?", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("r")) {
    return create.Boolean(false);
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip) {
      throw create.Error("program-error", `Illegal built-in file object.`);
    }
    return create.Boolean(!!bip.ready?.());
  } else if (port[1] === "string") {
    return create.Boolean(false);
  } else if (port[1] === "bytevector") {
    return create.Boolean(true); // Note: even if EOF, returns true.
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("read-error", fsMessage);
    }
    // Node.js has fstat, but doesn't have ftell(3) equivalent.
    // No way to say "ready" for reading.
    throw create.Error("program-error", `"Node.js file "ready" method is not implemented."`);
  } else {
    throw create.Error("program-error", `Unknown port type "${port[1]}"`);
  }
});

const readBytevector = defineBuiltInProcedure("read-bytevector", [
  { name: "k" },
  { name: "port", type: "optional" }
], ({ k, port }, itrp, stack) => {
  assert.IntegerNumber(k);
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-input-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  const arr: number[] = [];
  for (; ;) {
    const ret = readU8.body({ port }, itrp, stack) as LISP.RealNumber | LISP.EndOfFile;
    if (is.EndOfFile(ret)) {
      if (arr.length === 0) {
        return ret;
      } else {
        return create.ByteVector(arr, false);
      }
    } else {
      arr.push(ret[1]);
      if (arr.length >= k[1]) {
        return create.ByteVector(arr, false);
      }
    }
  }
});

const readBytevectorD = defineBuiltInProcedure("read-bytevector!", [
  { name: "bvec" },
  { name: "port", type: "optional" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ bvec, port, start, end }, itrp, stack) => {
  assert.ByteVector(bvec);
  assertNonNull(itrp);
  assertNonNull(stack);
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : bvec[1].length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const len = ed - st;
  const ret = readBytevector.body({k: create.Number(len), port}, itrp, stack) as LISP.ByteVector | LISP.EndOfFile;
  if (is.EndOfFile(ret)) {
    return ret;
  }
  for (let i = 0; i < ret[1].length; i++) {
    bvec[1][st + i] = ret[1][i];
  }
  return create.Number(ret[1].length);
});

// (write obj ) write library procedure
// (write obj port) write library procedure
// (write-shared obj ) write library procedure
// (write-shared obj port) write library procedure
// (write-simple obj ) write library procedure
// (write-simple obj port) write library procedure
// (display obj ) write library procedure
// (display obj port) write library procedure

const newline = defineBuiltInProcedure("newline", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  return writeString.body({ str: create.String("\n", false), port, start: null, end: null }, itrp, stack)
});

const writeChar = defineBuiltInProcedure("write-char", [
  { name: "char" },
  { name: "port", type: "optional" },
], ({ char, port }, itrp, stack) => {
  assert.Character(char);
  return writeString.body({ str: create.String(char[1], false), port, start: null, end: null  }, itrp, stack)
});

export const writeString = defineBuiltInProcedure("write-string", [
  { name: "str" },
  { name: "port", type: "optional" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ str, port, start, end }, itrp, stack) => {
  assert.String(str);
  assertNonNull(itrp);
  assertNonNull(stack);
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : str[1].length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const s = Array.from(str[1]).slice(st, ed).join("");
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-output-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("w")) {
    throw create.Error("write-error", "Port is not open for writing.")
  }
  if (typeof port[5] !== "string") {
    throw create.Error("write-error", "Not a text port.")
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip || !bip.write) {
      throw create.Error("program-error", `No built-in method defined to write.`);
    }
    bip.write(s);
  } else if (port[1] === "string") {
    port[2] = port[2] + s;
    // } else if (port[1] === "bytevector") {
    //   // Not a text port
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("write-error", fsMessage);
    }
    itrp.fs.writeSync(port[2], s);
  } else {
    throw create.Error("program-error", "Illegal type of port for writing.")
  }
  return ["<undefined>"];
});

const writeU8 = defineBuiltInProcedure("write-u8", [
  { name: "byte" },
  { name: "port", type: "optional" },
], ({ byte, port }, itrp, stack) => {
  assert.IntegerNumber(byte);
  return writeBytevector.body({ bvec: create.ByteVector([byte[1]], false), port}, itrp, stack);
});

const writeBytevector = defineBuiltInProcedure("write-bytevector", [
  { name: "bvec" },
  { name: "port", type: "optional" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ bvec, port, start, end }, itrp, stack) => {
  assert.ByteVector(bvec);
  assertNonNull(itrp);
  assertNonNull(stack);
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : bvec[1].length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const arr = bvec[1].slice(st, ed);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-output-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("w")) {
    throw create.Error("write-error", "Port is not open for writing.")
  }
  if (typeof port[5] === "string") {
    throw create.Error("write-error", "Not a binary port.")
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip || !bip.write) {
      throw create.Error("program-error", `No built-in method defined to write.`);
    }
    bip.write(new Uint8Array(arr));
  // } else if (port[1] === "string") {
    //   Not for binary
  } else if (port[1] === "bytevector") {
    port[2].push(...arr);
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("write-error", fsMessage);
    }
    itrp.fs.writeSync(port[2], new Uint8Array(arr));
  } else {
    throw create.Error("program-error", "Illegal type of port for writing.")
  }
  return ["<undefined>"];
});

const flushOutputPort = defineBuiltInProcedure("flush-output-port", [
  { name: "port", type: "optional" }
], ({ port }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!port) {
    port = itrp.getDynamic(contentCS(stack).env.dynamic, "current-output-port");
    assert.Port(port);
  } else {
    assert.Port(port);
  }
  if (!port[3]?.includes("w")) {
    throw create.Error("write-error", "Port is not open for writing.")
  }
  if (port[1] === "built-in") {
    if (!itrp) {
      throw create.Error("program-error", `No interpreter object.`);
    }
    const bip = itrp.getBuiltInPort(port[2]);
    if (!bip) {
      throw create.Error("program-error", `No built-in method defined to write.`);
    }
    bip.flush?.();
  // } else if (port[1] === "string") {
    //   No flush function.
  // } else if (port[1] === "bytevector") {
    //   No flush function.
  } else if (port[1] === "file") {
    if (!itrp?.fs) {
      throw create.Error("write-error", fsMessage);
    }
    itrp.fs.fsyncSync(port[2]);
  } else {
    // Ignore to flush.
    // throw create.Error("program-error", "No built-in method defined to flush.")
  }
  return ["<undefined>"];
});

export const procedures = {
  callWithPort, inputPortQ, outputPortQ, textualPortQ, binaryPortQ, portQ,
  inputPortOpenQ, outputPortOpenQ,
  closePort, closeInputPort, closeOutputPort, openInputString, openOutputString,
  getOutputString, openInputBytevector, openOutputBytevector, getOutputBytevector,
  readChar, peekChar, readLine, eofObjectQ, eofObject, charReadyQ, readString,
  readU8, peekU8, u8ReadyQ, readBytevector, readBytevectorD, newline,
  writeChar, writeString, writeU8, writeBytevector, flushOutputPort
};
