// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.8. Vectors" are defined in this file.

import { defineBuiltInProcedure, assert, create, is, listToArray } from "./utils";

const vectorQ = defineBuiltInProcedure("vector?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Vector(obj));
});

const makeVector = defineBuiltInProcedure("make-vector", [
  { name: "k" },
  { name: "fill", type: "optional" }
], ({ k, fill }) => {
  assert.IntegerNumber(k);
  if (fill) {
    assert.Object(fill);
  }
  return create.Vector(Array(k[1]).fill(fill ? fill : ["<undefined>"]), false);
});

const vector = defineBuiltInProcedure("vector", [
  { name: "objs", type: "variadic" }
], ({ objs }) => {
  assert.Objects(objs);
  return create.Vector(objs, false);
});

const vectorLength = defineBuiltInProcedure("vector-length", [
  { name: "vec" }
], ({ vec }) => {
  assert.Vector(vec);
  return create.Number(vec[1].length);
});

const vectorRef = defineBuiltInProcedure("vector-ref", [
  { name: "vec" },
  { name: "k" }
], ({ vec, k }) => {
  assert.Vector(vec);
  assert.IntegerNumber(k);
  if (!(k[1] in vec[1])) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  return vec[1][k[1]];
});

const vectorSetD = defineBuiltInProcedure("vector-set!", [
  { name: "vec" },
  { name: "k" },
  { name: "obj" },
], ({ vec, k, obj }) => {
  assert.Vector(vec);
  assert.IntegerNumber(k);
  assert.Object(obj);
  if (!(k[1] in vec[1])) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  if (is.Undefined(obj)) {
    throw create.Error("undefined-value", "Attempt to set a undefined value to vector.");
  }
  vec[1][k[1]] = obj;
  return ["<undefined>"];
});

const vectorToList = defineBuiltInProcedure("vector->list", [
  { name: "vec" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ vec, start, end }) => {
  assert.Vector(vec);
  const v = vec[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.List(...v.slice(st, ed));
});

const listToVector = defineBuiltInProcedure("list->vector", [
  { name: "list" }
], ({ list }) => {
  assert.List(list);
  return create.Vector(listToArray(list), false);
});

const vectorToString = defineBuiltInProcedure("vector->string", [
  { name: "vec" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ vec, start, end }) => {
  assert.Vector(vec);
  const v = vec[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.String(v.slice(st, ed).map(i => {
    assert.Character(i);
    return i[1];
  }).join(""), false);
});

const stringToVector = defineBuiltInProcedure("string->vector", [
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
  return create.Vector(arr.slice(st, ed).map(v => create.Character(v)), false);
});

const vectorCopy = defineBuiltInProcedure("vector-copy", [
  { name: "vec" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ vec, start, end }) => {
  assert.Vector(vec);
  const v = vec[1];
  if (v.length === 0) {
    return create.Vector([], false);
  }
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.Vector(v.slice(st, ed), false);
});

const vectorCopyD = defineBuiltInProcedure("vector-copy!", [
  { name: "to" },
  { name: "at" },
  { name: "from" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ to, at, from, start, end }) => {
  assert.Vector(to);
  assert.IntegerNumber(at);
  assert.Vector(from);
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

const vectorAppend = defineBuiltInProcedure("vector-append", [
  { name: "vecs", type: "variadic" }
], ({ vecs }) => {
  assert.Vectors(vecs);
  return create.Vector(vecs.map(v => v[1]).flat(), false);
});

const vectorFillD = defineBuiltInProcedure("vector-fill!", [
  { name: "vec" },
  { name: "fill" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ vec, fill, start, end }) => {
  assert.Vector(vec);
  assert.Object(fill);
  if (is.Undefined(fill)) {
    throw create.Error("undefined-value", "Attempt to fill vector with an undefined value.");
  }
  const v = vec[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : v.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  for (let i = st; i < ed; i++) {
    if (i in v) {
      v[i] = fill;
    }
  }
  return vec;
});

export const procedures = {
  vectorQ, makeVector, vector, vectorLength, vectorRef, vectorSetD,
  vector2list: vectorToList, list2vector: listToVector, vector2string: vectorToString, string2vector: stringToVector,
  vectorCopy, vectorCopyD, vectorAppend, vectorFillD
};
