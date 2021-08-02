// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.2. Numbers" are defined in this file.

// Numerical values are supported only to the extent that Javascript primitive numbers support.
// Javascript doesn't support fraction or complex numbers and doesn't distinguish between 1.0 and 1.
// exact? returns true only if Number.isSafeInteger returns true.
// denominator always returns 1.

import { fromJS } from "./parser";
import { LISP } from "./types";
import { assert, create, defineBuiltInProcedure, defineBuiltInProcedureAlias, is, JSNumberToNumber, numberToJSNumber } from "./utils";


// (complex? obj ) Not supported yet.
// (rational? obj ) Not supported yet.

const numberQ = defineBuiltInProcedure("number?", [
  { name: "obj" }
], ({ obj }) => {
  return create.Boolean(is.Number(obj));
});

const realQ = defineBuiltInProcedure("real?", [
  { name: "obj" }
], ({ obj }) => {
  return create.Boolean(is.Number(obj));
});

const integerQ = defineBuiltInProcedure("integer?", [
  { name: "obj" }
], ({ obj }) => {
  return create.Boolean(is.Number(obj) && Number.isInteger(numberToJSNumber(obj)));
});

const exactQ = defineBuiltInProcedure("exact?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(Number.isSafeInteger(num));
});

const inexactQ = defineBuiltInProcedure("inexact?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(!Number.isSafeInteger(num));
});

const exactIntegerQ = defineBuiltInProcedureAlias("exact-integer?", exactQ);

// finite?
// nan?

const eq = defineBuiltInProcedure("=", [
  { name: "z1" },
  { name: "z2" },
  { name: "zs", type: "variadic" }
], ({ z1, z2, zs }) => {
  assert.Number(z1);
  assert.Number(z2);
  assert.Numbers(zs);
  const vs = [z1, z2, ...zs].map(numberToJSNumber);
  return create.Boolean(vs.slice(1).every(v => vs[0] === v));
});

const lt = defineBuiltInProcedure("<", [
  { name: "z1" },
  { name: "z2" },
  { name: "zs", type: "variadic" }
], ({ z1, z2, zs }) => {
  assert.Number(z1);
  assert.Number(z2);
  assert.Numbers(zs);
  const vs = [z1, z2, ...zs].map(numberToJSNumber);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] < v));
});

const gt = defineBuiltInProcedure(">", [
  { name: "z1" },
  { name: "z2" },
  { name: "zs", type: "variadic" }
], ({ z1, z2, zs }) => {
  assert.Number(z1);
  assert.Number(z2);
  assert.Numbers(zs);
  const vs = [z1, z2, ...zs].map(numberToJSNumber);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] > v));
});

const le = defineBuiltInProcedure("<=", [
  { name: "z1" },
  { name: "z2" },
  { name: "zs", type: "variadic" }
], ({ z1, z2, zs }) => {
  assert.Number(z1);
  assert.Number(z2);
  assert.Numbers(zs);
  const vs = [z1, z2, ...zs].map(numberToJSNumber);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] <= v));
});

const ge = defineBuiltInProcedure(">=", [
  { name: "z1" },
  { name: "z2" },
  { name: "zs", type: "variadic" }
], ({ z1, z2, zs }) => {
  assert.Number(z1);
  assert.Number(z2);
  assert.Numbers(zs);
  const vs = [z1, z2, ...zs].map(numberToJSNumber);
  return create.Boolean(vs.every((v, i) => i === 0 ? true : vs[i - 1] >= v));
});

const nanQ = defineBuiltInProcedure("nan?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(Number.isNaN(num));
});

const zeroQ = defineBuiltInProcedure("zero?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(num === 0);
});

const positiveQ = defineBuiltInProcedure("positive?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(num > 0);
});

const negativeQ = defineBuiltInProcedure("negative?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(num < 0);
});

const oddQ = defineBuiltInProcedure("odd?", [
  { name: "n" }
], ({ n }) => {
  assert.Number(n);
  const num = numberToJSNumber(n);
  return create.Boolean(Number.isInteger(num) && Math.abs(num % 2) === 1);
});

const evenQ = defineBuiltInProcedure("even?", [
  { name: "n" }
], ({ n }) => {
  assert.Number(n);
  const num = numberToJSNumber(n);
  return create.Boolean(Number.isInteger(num) && Math.abs(num % 2) === 0);
});

const max = defineBuiltInProcedure("max", [
  { name: "xs", type: "variadic" }
], ({ xs }) => {
  assert.Numbers(xs);
  return JSNumberToNumber(Math.max(...xs.map(numberToJSNumber)));
});

const min = defineBuiltInProcedure("min", [
  { name: "xs", type: "variadic" }
], ({ xs }) => {
  assert.Numbers(xs);
  return JSNumberToNumber(Math.min(...xs.map(numberToJSNumber)));
});

const add = defineBuiltInProcedure("+", [
  { name: "zs", type: "variadic" }
], ({ zs }) => {
  assert.Numbers(zs);
  return JSNumberToNumber(zs.map(numberToJSNumber).reduce((acc, v) => acc + v, 0));
});

const sub = defineBuiltInProcedure("-", [
  { name: "z1" }, { name: "zs", type: "variadic" }
], ({ z1, zs }) => {
  assert.Number(z1);
  assert.Numbers(zs);
  const num1 = numberToJSNumber(z1);
  const nums = zs.map(numberToJSNumber);
  return JSNumberToNumber(nums.length === 0 ? -num1 : nums.reduce((acc, v) => acc - v, num1));
});

const mul = defineBuiltInProcedure("*", [
  { name: "zs", type: "variadic" }
], ({ zs }) => {
  assert.Numbers(zs);
  return JSNumberToNumber(zs.map(numberToJSNumber).reduce((acc, v) => acc * v, 1));
});

const div = defineBuiltInProcedure("/", [
  { name: "z1" }, { name: "zs", type: "variadic" }
], ({ z1, zs }) => {
  assert.Number(z1);
  assert.Numbers(zs);
  const num1 = numberToJSNumber(z1);
  const nums = zs.map(numberToJSNumber);
  if (nums.includes(0)) {
    return create.Error("division-by-zero", null);
  }
  return JSNumberToNumber(nums.length === 0 ? 1 / num1 : nums.reduce((acc, v) => acc / v, num1));
});


const abs = defineBuiltInProcedure("abs", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(Math.abs(num));
});

const floorS = defineBuiltInProcedure("floor/", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const modulo = ((num1 % num2) + num2) % num2;
  const quotient = (num1 - modulo) / num2;
  return create.MultiValue([JSNumberToNumber(quotient), JSNumberToNumber(modulo)]);
});

const floorQuotient = defineBuiltInProcedure("floor-quotient", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const modulo = ((num1 % num2) + num2) % num2;
  const quotient = (num1 - modulo) / num2;
  return JSNumberToNumber(quotient);
});

const floorRemainder = defineBuiltInProcedure("floor-remainder", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const modulo = ((num1 % num2) + num2) % num2;
  return JSNumberToNumber(modulo);
});

const truncateS = defineBuiltInProcedure("truncate/", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const reminder = num1 % num2;
  const quotient = (num1 - reminder) / num2;
  return create.MultiValue([JSNumberToNumber(quotient), JSNumberToNumber(reminder)]);
});

const truncateQuotient = defineBuiltInProcedure("truncate-quotient", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const reminder = num1 % num2;
  const quotient = (num1 - reminder) / num2;
  return JSNumberToNumber(quotient);
});

const truncateRemainder = defineBuiltInProcedure("truncate-remainder", [
  { name: "n1" },
  { name: "n2" }
], ({ n1, n2 }) => {
  assert.Number(n1);
  assert.Number(n2);
  const num1 = numberToJSNumber(n1);
  const num2 = numberToJSNumber(n2);
  const remainder = num1 % num2;
  return JSNumberToNumber(remainder);
});

const quotient = defineBuiltInProcedureAlias("quotient", truncateQuotient);
const remainder = defineBuiltInProcedureAlias("remainder", truncateRemainder);
// Javascript's "%" operator is "reminder" operator, not "modulo" operator.
// R7RS's "floor-reminder" seems "modulo" like Python/Perl's "%", not "reminder".
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
const modulo = defineBuiltInProcedureAlias("modulo", floorRemainder);

const gcd = defineBuiltInProcedure("gcd", [
  { name: "ns", type: "variadic" },
], ({ ns }) => {
  assert.Numbers(ns);
  if (ns.length === 0) {
    return JSNumberToNumber(0);
  }
  const gcd2 = (a: number, b: number): number => (b !== 0) ? gcd2(b, a % b) : a;
  return JSNumberToNumber(Math.abs(ns.map(numberToJSNumber).reduce(gcd2)));
});

const lcm = defineBuiltInProcedure("lcm", [
  { name: "ns", type: "variadic"  },
], ({ ns }) => {
  assert.Numbers(ns);
  if (ns.length === 0) {
    return JSNumberToNumber(1);
  }
  const gcd2 = (a: number, b: number): number => (b !== 0) ? gcd2(b, a % b) : a;
  const lcm2 = (a: number, b: number): number => (a * b) / gcd2(a, b);
  return JSNumberToNumber(Math.abs(ns.map(numberToJSNumber).reduce(lcm2)));
});

// const numerator = defineBuiltInProcedure("numerator", [
//   { name: "q" },
// ], ({ q }) => {
//   assert.Number(q);
//   return q; // fraction numbers are not supported.
// });

// const denominator = defineBuiltInProcedure("denominator", [
//   { name: "q" },
// ], ({ q }) => {
//   assert.Number(q);
//   return JSNumberToNumber(1); // fraction numbers are not supported.
// });

const floor = defineBuiltInProcedure("floor", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(Math.floor(num));
});

const ceiling = defineBuiltInProcedure("ceiling", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(Math.ceil(num));
});

const truncate = defineBuiltInProcedure("truncate", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(Math.trunc(num));
});

const round = defineBuiltInProcedure("round", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(Math.round(num));
});

const rationalize = defineBuiltInProcedure("rationalize", [
  { name: "x" },
  { name: "y" },
], () => {
  throw create.Error("not-supported", `"Fraction numbers are not supported.`);
});

// (exp z) inexact library procedure.
// (log z) inexact library procedure.
// (log z1 z2) inexact library procedure.
// (sin z) inexact library procedure.
// (cos z) inexact library procedure.
// (tan z) inexact library procedure.
// (asin z) inexact library procedure.
// (acos z) inexact library procedure.
// (atan z) inexact library procedure.
// (atan y x) inexact library procedure.

const square = defineBuiltInProcedure("square", [
  { name: "x" },
], ({ x }) => {
  assert.Number(x);
  const num = numberToJSNumber(x);
  return JSNumberToNumber(num ** 2);
});

// (sqrt z) inexact library procedure.
const exactIntegerSqrt = defineBuiltInProcedure("exact-integer-sqrt", [
  { name: "k" },
], ({ k }) => {
  assert.IntegerNumber(k);
  const num = numberToJSNumber(k);
  if (!Number.isSafeInteger(num) || num < 0) {
    throw create.Error("out-of-range", "exact-integer-sqrt can calculate exact & non-negative value.");
  }
  const s = Math.floor(Math.sqrt(num));
  const r = num - (s ** 2);
  return create.MultiValue([JSNumberToNumber(s), JSNumberToNumber(r)]);
});

const expt = defineBuiltInProcedure("expt", [
  { name: "z1" },
  { name: "z2" },
], ({ z1, z2 }) => {
  assert.Number(z1);
  assert.Number(z2);
  const num1 = numberToJSNumber(z1);
  const num2 = numberToJSNumber(z2);
  return JSNumberToNumber(num1 ** num2);
});

// (make-rectangular x1 x2) complex library procedure.
// (make-polar x3 x4) complex library procedure.
// (real-part z) complex library procedure.
// (imag-part z) complex library procedure.
// (magnitude z) complex library procedure.
// (angle z) complex library procedure.

const inexact = defineBuiltInProcedure("inexact", [
  { name: "z" },
], ({ z }) => {
  assert.Number(z);
  return z; // We don't support exact/inexact numbers directly.
});

const exact = defineBuiltInProcedure("exact", [
  { name: "z" },
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  const v = Number(num.toFixed());
  if (!Number.isSafeInteger(v)) {
    throw create.Error("out-of-range", `"exact" can't calculate exact number for ${z[1]}.`);
  }
  return z; // Returns a number that matches Number.isSafeInteger.
});

const numberToString = defineBuiltInProcedure("number->string", [
  { name: "z" },
  { name: "radix", type: "optional" },
], ({ z, radix }) => {
  assert.Number(z);
  assert.Number(radix);
  const num = numberToJSNumber(z);
  if (isNaN(num)) {
    return create.String("+nan.0", false);
  } else if (!isFinite(num)) {
    return create.String(`${num > 0 ? "+" : "-"}inf.0`, false);
  } else {
    if (radix) {
      assert.IntegerNumber(radix);
    }
    const r = radix ? numberToJSNumber(radix) : 10;
    if (![2, 8, 10, 16].includes(r)) {
      throw create.Error("out-of-range", "radix must be one of 2, 8, 10, 16.")
    }
    return create.String(num.toString(r), false);
  }
});

const stringToNumber = defineBuiltInProcedure("string->number", [
  { name: "str" },
  { name: "radix", type: "optional" },
], ({ str, radix }) => {
  assert.String(str);
  let s = str[1];
  if (radix) {
    assert.IntegerNumber(radix);
    if (![2, 8, 10, 16].includes(numberToJSNumber(radix))) {
      throw create.Error("out-of-range", "radix must be one of 2, 8, 10, 16.");
    }
    const prefix = `#${{ 2: "b", 8: "o", 10: "d", 16: "x" }[numberToJSNumber(radix)]}`;
    s = s.replace(/^(#[dDbBoOxX])?/, prefix);
  }

  let ret: LISP.Object;
  try {
    ret = fromJS(s);
  } catch (e) {
    return create.Boolean(false);
  }

  if (is.Number(ret)) {
    return ret;
  } else {
    return create.Boolean(false);
  }
});

export const procedures = {
  numberQ, realQ, integerQ,
  exactQ, inexactQ, exactIntegerQ, eq, lt, gt, le, ge,
  nanQ, zeroQ, positiveQ, negativeQ, oddQ, evenQ,  max, min, add, sub, mul, div, abs,
  floorS, floorQuotient, floorRemainder, truncateS, truncateQuotient, truncateRemainder,
  quotient, remainder, modulo, gcd, lcm, // numerator, denominator,
  floor, ceiling, truncate, rationalize, round,
  square, exactIntegerSqrt, expt, inexact, exact, numberToString, stringToNumber
};
