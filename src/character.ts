// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.6. Characters" are defined in this file.

import { defineBuiltInProcedure, assert, create, is } from "./utils";

const charQ = defineBuiltInProcedure("char?", [
    { name: "obj" }
], ({ obj }) => {
    assert.Object(obj);
    return create.Boolean(is.Character(obj));
});

const charEQ = defineBuiltInProcedure("char=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  return create.Boolean([char2, ...chars].every(v => v[1] === char1[1]));
});

const charLtQ = defineBuiltInProcedure("char<?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => char[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] < v));
});

const charGtQ = defineBuiltInProcedure("char>?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => char[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] > v));
});

const charLeQ = defineBuiltInProcedure("char<=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => char[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] <= v));
});

const charGeQ = defineBuiltInProcedure("char>=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => char[1]);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] >= v));
});

// // (char-ci=? char1 char2 char3 . . . ) char library procedure

// // (char-ci<? char1 char2 char3 . . . ) char library procedure

// // (char-ci>? char1 char2 char3 . . . ) char library procedure

// // (char-ci<=? char1 char2 char3 . . . ) char library procedure

// // (char-ci>=? char1 char2 char3 . . . ) char library procedure

// // (char-alphabetic? char) char library procedure

// // (char-numeric? char) char library procedure

// // (char-whitespace? char) char library procedure

// // (char-upper-case? letter) char library procedure

// // (char-lower-case? letter) char library procedure

// // (digit-value char) char library procedure

const charToInteger = defineBuiltInProcedure("char->integer", [
    { name: "char" }
], ({ char }) => {
    assert.Character(char);
    const v = char[1].codePointAt(0);
    if (v === undefined) {
      throw create.Error("out-of-range", "Can't convert character to codepoint.");
    }
    return create.Number(v);
});

const integerToChar = defineBuiltInProcedure("integer->char", [
    { name: "n" }
], ({ n }) => {
    assert.IntegerNumber(n);
    return create.Character(String.fromCodePoint(n[1]));
});

// (char-upcase char) char library procedure

// (char-downcase char) char library procedure

// (char-foldcase char) char library procedure

export const procedures = {
  charQ, charEQ, charLtQ, charGtQ, charLeQ, charGeQ, charToInteger, integerToChar
};

