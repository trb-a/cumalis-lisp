import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { assert, create, defineBuiltInProcedure, foldcase } from "../utils";

// // (char-ci=? char1 char2 char3 . . . ) char library procedure
const charCiEQ = defineBuiltInProcedure("char-ci=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => foldcase(char[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] === v));
}, false, true);

// // (char-ci<? char1 char2 char3 . . . ) char library procedure
const charCiLtQ = defineBuiltInProcedure("char-ci<?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => foldcase(char[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] < v));
}, false, true);

// // (char-ci>? char1 char2 char3 . . . ) char library procedure
const charCiGtQ = defineBuiltInProcedure("char-ci>?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => foldcase(char[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] > v));
}, false, true);

// // (char-ci<=? char1 char2 char3 . . . ) char library procedure
const charCiLeQ = defineBuiltInProcedure("char-ci<=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => foldcase(char[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] <= v));
}, false, true);

// // (char-ci>=? char1 char2 char3 . . . ) char library procedure
const charCiGeQ = defineBuiltInProcedure("char-ci>=?", [
  { name: "char1" },
  { name: "char2" },
  { name: "chars", type: "variadic" }
], ({ char1, char2, chars }) => {
  assert.Character(char1);
  assert.Character(char2);
  assert.Characters(chars);
  const vs = [char1, char2, ...chars].map(char => foldcase(char[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] >= v));
}, false, true);

// // (char-alphabetic? char) char library procedure
// Note: Depending on "@babel/plugin-proposal-unicode-property-regex"
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes
const charAlphabeticQ = defineBuiltInProcedure("char-alphabetic?", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Boolean(/\p{Alphabetic}/u.test(char[1]));
}, false, true);

// // (char-numeric? char) char library procedure
// Note: The definition of char-numeric? refers to a nonexistent Unicode property Numeric_Digit.
const charNumberQ = defineBuiltInProcedure("char-numeric?", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Boolean(/\p{Decimal_Number}/u.test(char[1]));
}, false, true);

// // (char-whitespace? char) char library procedure
const charWhitespaceQ = defineBuiltInProcedure("char-whitespace?", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Boolean(/\p{White_Space}/u.test(char[1]));
}, false, true);

// // (char-upper-case? letter) char library procedure
const charUpperCaseQ = defineBuiltInProcedure("char-upper-case?", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Boolean(/\p{Uppercase}/u.test(char[1]));
}, false, true);

// // (char-lower-case? letter) char library procedure
const charLowerCaseQ = defineBuiltInProcedure("char-lower-case?", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Boolean(/\p{Lowercase}/u.test(char[1]));
}, false, true);

// // (digit-value char) char library procedure
const charDigitValueQ = defineBuiltInProcedure("digit-value", [
  { name: "char" }
], ({ char }) => {
  // Refer: UNICODE Nd (Decimal_Number)
  const zeroCodepoints = [
    0x0030, 0x0660, 0x06F0, 0x07C0, 0x0966, 0x09E6, 0x0A66, 0x0AE6,
    0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66, 0x0DE6, 0x0E50, 0x0ED0,
    0x0F20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80,
    0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900,
    0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10, 0x104A0, 0x11066, 0x110F0,
    0x11136, 0x111D0, 0x112F0, 0x114D0, 0x11650, 0x116C0, 0x11730,
    0x118E0, 0x16A60, 0x16B50, 0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6
  ];
  assert.Character(char);
  const cp = char[1].codePointAt(0) ?? 0;
  const zeroCodepoint = zeroCodepoints.find(v => cp >= v && cp <= v + 9);
  if (zeroCodepoint) {
    return create.Number(cp - zeroCodepoint);
  } else {
    return create.Boolean(false);
  }
}, false, true);

// (char-upcase char) char library procedure
const charUpcase = defineBuiltInProcedure("char-upcase", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Character(char[1].toUpperCase());
}, false, true);

// (char-downcase char) char library procedure
const charDowncase = defineBuiltInProcedure("char-downcase", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Character(char[1].toLowerCase());
}, false, true);

// (char-foldcase char) char library procedure
const charFoldcase = defineBuiltInProcedure("char-foldcase", [
  { name: "char" }
], ({ char }) => {
  assert.Character(char);
  return create.Character(foldcase(char[1]));
}, false, true);

// (string-ci=? string1 string2 string3 ... ) char library procedure
const stringCiEQ = defineBuiltInProcedure("string-ci=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => foldcase(str[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] === v));
}, false, true);

// (string-ci<? string1 string2 string3 ... ) char library procedure
const stringCiLtQ = defineBuiltInProcedure("string-ci<?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => foldcase(str[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] < v));
}, false, true);

// (string-ci>? string1 string2 string3 ... ) char library procedure
const stringCiGtQ = defineBuiltInProcedure("string-ci>?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => foldcase(str[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] > v));
}, false, true);

// (string-ci<=? string1 string2 string3 ... ) char library procedure
const stringCiLeQ = defineBuiltInProcedure("string-ci<=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => foldcase(str[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] <= v));
}, false, true);

// (string-ci>=? string1 string2 string3 ... ) char library procedure
const stringCiGeQ = defineBuiltInProcedure("string-ci>=?", [
  { name: "str1" },
  { name: "str2" },
  { name: "strs", type: "variadic" },
], ({ str1, str2, strs }) => {
  assert.String(str1);
  assert.String(str2);
  assert.Strings(strs);
  const vs = [str1, str2, ...strs].map(str => foldcase(str[1]));
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] >= v));
}, false, true);

// (string-upcase string) char library procedure
const stringUpcase = defineBuiltInProcedure("string-upcase", [
  { name: "str" },
], ({ str }) => {
  assert.String(str);
  return create.String(str[1].toUpperCase(), false);
}, false, true);

// (string-downcase string) char library procedure
const stringDowncase = defineBuiltInProcedure("string-downcase", [
  { name: "str" },
], ({ str }) => {
  assert.String(str);
  return create.String(str[1].toLowerCase(), false);
}, false, true);

// (string-foldcase string) char library procedure
const stringFoldcase = defineBuiltInProcedure("string-foldcase", [
  { name: "str" },
], ({ str }) => {
  assert.String(str);
  return create.String(foldcase(str[1]), false);
}, false, true);

const procedures = [
  charCiEQ, charCiLtQ, charCiGtQ, charCiLeQ,
  charCiGeQ, charAlphabeticQ, charNumberQ, charWhitespaceQ,
  charUpperCaseQ, charLowerCaseQ, charDigitValueQ, charUpcase,
  charDowncase, charFoldcase,
  stringCiEQ, stringCiLtQ, stringCiGtQ, stringCiLeQ, stringCiGeQ,
  stringUpcase, stringDowncase, stringFoldcase
];

const CharLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({ name }) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default CharLibrary;


