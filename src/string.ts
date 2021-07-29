// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.7. Strings" are defined in this file.

import { defineBuiltInProcedure, assert, create, is, listToArray } from "./utils";

const stringQ = defineBuiltInProcedure("string?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.String(obj));
});

const makeString = defineBuiltInProcedure("make-string", [
  { name: "k" },
  { name: "char", type: "optional" }
], ({ k, char }) => {
  assert.IntegerNumber(k);
  if (char) {
    assert.Character(char);
  }
  return create.String((char ? char[1] : " ").repeat(k[1]), false);
});

const string = defineBuiltInProcedure("string", [
  { name: "chars", type: "variadic" }
], ({ chars }) => {
  assert.Characters(chars);
  return create.String(chars.map(c => c[1]).join(""), false);
});

const stringLength = defineBuiltInProcedure("string-length", [
  { name: "str" }
], ({ str }) => {
  assert.String(str);
  return create.Number(str[1].length);
});

const stringRef = defineBuiltInProcedure("string-ref", [
  { name: "str" },
  { name: "k" }
], ({ str, k }) => {
  assert.String(str);
  assert.IntegerNumber(k);
  const v = str[1][k[1]];
  if (!v) {
    throw create.Error("out-of-range", `The specified string doesn't have character with index ${k[1]}.`);
  }
  return create.Character(v);
});

const stringSetD = defineBuiltInProcedure("string-set!", [
  { name: "str" },
  { name: "k" },
  { name: "char" },
], ({ str, k, char }) => {
  assert.String(str);
  assert.IntegerNumber(k);
  assert.Character(char);
  str[1] = str[1].slice(0, k[1]) + char[1] + str[1].slice(k[1] + char[1].length);
  return ["<undefined>"];
});

const stringEQ = defineBuiltInProcedure("string=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  return create.Boolean([str2, ...strs].every(b => b[1] === str1[1]));
});

// (string-ci=? string1 string2 string3 . . . ) char library procedure

const stringLtQ = defineBuiltInProcedure("string<?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => str[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] < v));
});

// (string-ci<? string1 string2 string3 . . . ) char library procedure

const stringGtQ = defineBuiltInProcedure("string>?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => str[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] > v));
});

// (string-ci>? string1 string2 string3 . . . ) char library procedure

const stringLeQ = defineBuiltInProcedure("string<=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => str[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] <= v));
});

// (string-ci<=? string1 string2 string3 . . . ) char library procedure

const stringGeQ = defineBuiltInProcedure("string>=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => str[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] >= v));
});

// (string-ci>=? string1 string2 string3 . . . ) char library procedure

// (string-upcase string) char library procedure

// (string-downcase string) char library procedure

// (string-foldcase string) char library procedure

const substring = defineBuiltInProcedure("substring", [
  { name: "str" },
  { name: "start" },
  { name: "end" },
], ({ str, start, end }) => {
  assert.String(str);
  assert.IntegerNumber(start);
  assert.IntegerNumber(end);
  if (str[1].length === 0) {
    return create.String("", false);
  }
  return create.String(str[1].slice(start[1], end[1]), false);
});

const stringAppend = defineBuiltInProcedure("string-append", [
  { name: "strs", type: "variadic" }
], ({ strs }) => {
  assert.Strings(strs);
  return create.String(strs.map(v => v[1]).join(""), false);
});

const stringToList = defineBuiltInProcedure("string->list", [
  { name: "str" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ str, start, end }) => {
  assert.String(str);
  const s = str[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : s.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.List(
    ...s.slice(st, ed).split("").map(v => create.Character(v))
  );
});

const listToString = defineBuiltInProcedure("list->string", [
  { name: "list" }
], ({ list }) => {
  assert.List(list);
  const chars = listToArray(list);
  assert.Characters(chars);
  return create.String(chars.map(v => v[1]).join(""), false);
});

const stringCopy = defineBuiltInProcedure("string-copy", [
  { name: "str" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ str, start, end }) => {
  assert.String(str);
  const s = str[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : s.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  return create.String(s.slice(st, ed), false);
});

const stringCopyD = defineBuiltInProcedure("string-copy!", [
  { name: "to" },
  { name: "at" },
  { name: "from" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ to, at, from, start, end }) => {
  assert.String(to);
  assert.IntegerNumber(at);
  assert.String(from);
  const s = from[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : s.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  if (at[1] < 0 || at[1] >= s.length) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  if ((s.length - at[1]) < ed - st) {
    throw create.Error("out-of-range", "Index is out of range.");
  }
  const str = s.slice(st, ed);
  to[1] = to[1].slice(0, at[1]) + str + to[1].slice(at[1] + str.length);
  return ["<undefined>"];
});

const stringFillD = defineBuiltInProcedure("string-fill!", [
  { name: "str" },
  { name: "fill" },
  { name: "start", type: "optional" },
  { name: "end", type: "optional" },
], ({ str, fill, start, end }) => {
  assert.String(str);
  assert.Character(fill);
  const s = str[1];
  const st = is.Number(start) ? start[1] : 0;
  const ed = is.Number(end) ? end[1] : s.length;
  if (typeof st !== "number" || !Number.isInteger(st) || typeof ed !== "number" || !Number.isInteger(ed)) {
    throw create.Error("domain-error", "Index must be integer.");
  }
  const replacee = s.slice(st, ed);
  // "-----", "x", 1, 2
  // "-x---"
  str[1] = str[1].slice(0, st) + fill[1].repeat(replacee.length) + str[1].slice(ed);
  return str;
});

export const procedures = {
  stringQ, makeString, string, stringLength, stringRef, stringSetD,
  stringEQ, stringLtQ, stringGtQ, stringLeQ, stringGeQ, substring, stringAppend,
  stringToList, listToString, stringCopy, stringCopyD, stringFillD,
};
