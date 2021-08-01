import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { assert, create, defineBuiltInProcedure, JSNumberToNumber, numberToJSNumber } from "../utils";

const finiteQ = defineBuiltInProcedure("finite?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(Number.isFinite(num));
});

const infiniteQ = defineBuiltInProcedure("infinite?", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return create.Boolean(!Number.isNaN(num) && !Number.isFinite(num));
});

// (exp z) inexact library procedure.
const exp = defineBuiltInProcedure("exp", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.exp(num));
});

// (log z) inexact library procedure.
// (log z1 z2) inexact library procedure.
const log = defineBuiltInProcedure("log", [
  { name: "z1" },
  { name: "z2", type: "optional" }
], ({ z1, z2 }) => {
  assert.Number(z1);
  const num1 = numberToJSNumber(z1);
  if (z2) {
    assert.Number(z2);
    const num2 = numberToJSNumber(z2);
    return JSNumberToNumber(Math.log(num1) / Math.log(num2));
  } else {
    return JSNumberToNumber(Math.log(num1));
  }
});

// (sin z) inexact library procedure.
const sin = defineBuiltInProcedure("sin", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.sin(num));
});

// (cos z) inexact library procedure.
const cos = defineBuiltInProcedure("cos", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.cos(num));
});

// (tan z) inexact library procedure.
const tan = defineBuiltInProcedure("tan", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.tan(num));
});

// (asin z) inexact library procedure.
const asin = defineBuiltInProcedure("asin", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.asin(num));
});

// (acos z) inexact library procedure.
const acos = defineBuiltInProcedure("acos", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.acos(num));
});

// (atan z) inexact library procedure.
// (atan y x) inexact library procedure.
const atan = defineBuiltInProcedure("atan", [
  { name: "z1" },
  { name: "z2", type: "optional" }
], ({ z1, z2 }) => {
  assert.Number(z1);
  const num1 = numberToJSNumber(z1);
  if (z2) {
    assert.Number(z2);
    const num2 = numberToJSNumber(z2);
    return JSNumberToNumber(Math.atan2(num1, num2));
  } else {
    return JSNumberToNumber(Math.atan(num1))
  }
});

// (sqrt z) inexact library procedure.
const sqrt = defineBuiltInProcedure("sqrt", [
  { name: "z" }
], ({ z }) => {
  assert.Number(z);
  const num = numberToJSNumber(z);
  return JSNumberToNumber(Math.sqrt(num));
});

const procedures = [finiteQ,infiniteQ,exp,log,sin,cos,tan,asin,acos,atan,sqrt];
const InexactLibrary: BuiltInLibraryDefinition = (itrp) => {
  [...procedures].forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default InexactLibrary;


