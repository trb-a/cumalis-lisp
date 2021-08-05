// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.9. Bytevectors" are defined in this file.

import { defineBuiltInProcedure, assert, create, is } from "./utils";

const bytevectorQ = defineBuiltInProcedure("bytevector?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.ByteVector(obj));
});

const makeBytevector = defineBuiltInProcedure("make-bytevector", [
  { name: "k" },
  { name: "byte", type: "optional" }
], ({ k, byte }) => {
  assert.IntegerNumber(k);
  if (byte) {
    assert.IntegerNumber(byte);
  }
  return create.ByteVector(Array(k[1]).fill(byte ? byte[1] : 0), false);
});

const bytevector = defineBuiltInProcedure("bytevector", [
  { name: "bytes", type: "variadic" }
], ({ bytes }) => {
  assert.IntegerNumbers(bytes);
  return create.ByteVector(bytes.map(v => v[1]), false);
});

const bytevectorLength = defineBuiltInProcedure("bytevector-length", [
  { name: "bvec" }
], ({ bvec }) => {
  assert.ByteVector(bvec);
  return create.Number(bvec[1].length);
});

const bytevectorU8Ref = defineBuiltInProcedure("bytevector-u8-ref", [
  { name: "bvec" },
  { name: "k" }
], ({ bvec, k }) => {
  assert.ByteVector(bvec);
  assert.IntegerNumber(k);
  if (!(k[1] in bvec[1])) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  return create.Number(bvec[1][k[1]]);
});

// (bytevector-u8-set! bytevector k byte) procedure
const bytevectorU8SetD = defineBuiltInProcedure("bytevector-u8-set!", [
  { name: "bvec" },
  { name: "k" },
  { name: "byte" },
], ({ bvec, k, byte }) => {
  assert.ByteVector(bvec);
  assert.IntegerNumber(k);
  assert.IntegerNumber(byte);
  if (!(k[1] in bvec[1])) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  bvec[1][k[1]] = byte[1];
  return ["<undefined>"];
});

const bytevectorCopy = defineBuiltInProcedure("bytevector-copy", [
  { name: "bvec" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ bvec, start, end }) => {
  assert.ByteVector(bvec);
  const v = bvec[1];
  if (v.length === 0) {
    return create.ByteVector([], false);
  }
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.ByteVector(v.slice(st, ed), false);
});

const bytevectorCopyD = defineBuiltInProcedure("bytevector-copy!", [
  { name: "to" },
  { name: "at" },
  { name: "from" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ to, at, from, start, end }) => {
  assert.ByteVector(to);
  assert.IntegerNumber(at);
  assert.ByteVector(from);
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : from[1].length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  if (!(at[1] in to[1])) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  if ((to[1].length - at[1]) < ed - st) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  const repl = from[1].slice(st, ed);
  to[1].splice(at[1], repl.length, ...repl);
  return ["<undefined>"];
});

const bytevectorAppend = defineBuiltInProcedure("bytevector-append", [
  { name: "vecs", type: "variadic" }
], ({ vecs }) => {
  assert.ByteVectors(vecs);
  return create.ByteVector(vecs.map(v => v[1]).flat(), false);
});

// Note: This function use TextDecoder.encode API. (IE needs polyfill)
const utf8ToString = defineBuiltInProcedure("utf8->string", [
  { name: "bvec" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ bvec, start, end }) => {
  assert.ByteVector(bvec);
  const v = bvec[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const u8arr = new Uint8Array(v.slice(st, ed));
  return create.String(new TextDecoder().decode(u8arr), false);
});


const stringToUtf8 = defineBuiltInProcedure("string->utf8", [
  { name: "str" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ str, start, end }) => {
  assert.String(str);
  const arr = Array.from(str[1]);
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : arr.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const u8arr = new TextEncoder().encode(arr.slice(st, ed).join(""));
  return create.ByteVector(Array.from(u8arr), false);
});

export const procedures = {
  bytevectorQ, makeBytevector, bytevector, bytevectorLength, bytevectorU8Ref, bytevectorU8SetD,
  bytevectorCopy, bytevectorCopyD, bytevectorAppend, utf8ToString, stringToUtf8,
};

