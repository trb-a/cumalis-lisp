/* eslint-disable jest/no-conditional-expect */
import fs from "fs";
import { assert, contentCS, create, defineBuiltInProcedure, forms, fromReferentialJSON, is, isSuspendEnvelope, SuspendEnvelope, suspendValueFromEnvelope, toReferentialJSON } from "../src/utils";
import { equalQ } from "../src/equivalence";
import { toJS, writeObject } from "../src/unparser";
import { Interpreter } from "../src/interpreter";
import { LISP } from "../src/types";
import { fromJS } from "../src";

const logger = console; // To avoid to type console dot log.
const r7rsTest = fs.readFileSync("./__tests__/r7rs.scm").toString();

// This is for testing serialize/deserialize for every call-frame.
// Very slow!
// const beforeExecute: InterpreterOptions["beforeExecute"] = (stack, value) => {
//   const json = toReferentialJSON([stack, value], "$$$");
//   return fromReferentialJSON(json, "$$$");
// }
// const itrp = new Interpreter({fs, debug: false, verbose: false, beforeExecute});

const itrp = new Interpreter({fs});

let testCount = 0;
let failCount = 0;

const testProc = defineBuiltInProcedure("test", [
  {name: "tobe", evaluate: false},
  {name: "target", evaluate: false},
], ({tobe, target}, _itrp, stack) => {
  assert.Object(tobe);
  assert.Object(target);
  testCount++;
  const info = contentCS(stack).info;
  logger.log(
    writeObject(target) + " ==> " + writeObject(tobe) + "\n" +
    JSON.stringify(info)
  );
  return forms.CallBuiltIn("test-1", tobe, target);
}, true);

const test1Proc = defineBuiltInProcedure("test-1", [
  {name: "tobe"},
  {name: "target"},
], ({tobe, target}) => {
  assert.Object(tobe);
  assert.Object(target);
  if (!is.False(equalQ.body({obj1: tobe, obj2: target}))) {
    logger.log("OK!");
  } else {
    failCount++;
    logger.log("******** <<<< [[ NG! ]] >>>> **********" + "\nReturned value:" + writeObject(target));
  }
  return ["<undefined>"];
});

const testValuesProc = defineBuiltInProcedure("test-values", [
  {name: "tobe", evaluate: false},
  {name: "target", evaluate: false},
], ({tobe, target}, _itrp, stack) => {
  assert.Object(tobe);
  assert.Object(target);
  const info = contentCS(stack).info;
  logger.log(
    writeObject(target) + " ==> " + writeObject(tobe) + "\n" +
    JSON.stringify(info)
  );
  return forms.CallBuiltIn("test-values-1", tobe, target);
}, true);

// Note: Only for this test.
const testValues1Proc = defineBuiltInProcedure("test-values-1", [
  {name: "tobe"},
  {name: "target"},
], ({tobe, target}) => {
  assert.Object(tobe);
  assert.Object(target);
  if (JSON.stringify(tobe) === JSON.stringify(target)) {
    logger.log("OK!");
  } else {
    logger.log("******** <<<< [[ NG! ]] >>>> **********");
  }
  return ["<undefined>"];
});

const testBeginProc = defineBuiltInProcedure("test-begin", [
  { name: "str" }
], ({str}) => {
  assert.String(str);
  logger.log("--------------------------------");
  logger.log("   " + str[1]);
  logger.log("--------------------------------");
  return ["<undefined>"];
});

const testEndProc = defineBuiltInProcedure("test-end", [
], () => {
  logger.log("////////////////////////////////");
  return ["<undefined>"];
});

itrp.setBuiltInProcedure(testProc);
itrp.setBuiltInProcedure(test1Proc);
itrp.setBuiltInProcedure(testValuesProc);
itrp.setBuiltInProcedure(testValues1Proc);
itrp.setBuiltInProcedure(testBeginProc);
itrp.setBuiltInProcedure(testEndProc);

test('Results', () => {
  try {
    itrp.eval(r7rsTest);
  } catch (e) {
    if (e instanceof Error) {
      logger.log("R7RSTEST: JS EXCEPTOION", e.name, e.message, "\n", e.stack);
    } else {
      logger.log("ERROR\n", typeof e, e);
    }
    throw e;
  }
  logger.log(`EXECUTED ${testCount} tests.`)
  expect(failCount).toBe(0);
});

let console_value: any = null;
const console__log = (v: any) => (console_value = v, undefined);

test('Basic example', () => {
  const itrp = new Interpreter(); // Create interpreter.
  const ret = itrp.eval(`
    (define (fib n)
      (if (<= n 2)
          1
          (+ (fib (- n 1)) (fib (- n 2)))))
    (fib 10)
  `); // Evaluate S-expression.
  expect(toJS(ret)).toBe(55);
});


test('Defining built-in function / built-in macro example', () => {
  const itrp = new Interpreter(); // Create interpreter.
  const helloProc = defineBuiltInProcedure("hello", [ // Define procedure
    { name: "obj" }
  ], function ({obj}) {
    if (!is.Object(obj)) {
      throw new Error("Not a object");
    }
    console__log(`Hello ${toJS(obj)}`);
    return create.Number(42);
  });
  const hello2Proc = defineBuiltInProcedure("hello2", [ // Define macro
    { name: "obj" }
  ], function ({obj}) {
    if (!is.Object(obj)) {
      throw new Error("Not a object");
    }
    return fromJS(["string-append", `"HELLO "`, obj]); // Write LISP as JS array.
  }, true); // <-- this "true" indicates macro.

  itrp.setBuiltInProcedure(helloProc); // Set the procedure to the interpreter.
  itrp.setBuiltInProcedure(hello2Proc);

  expect(toJS(itrp.eval(`(hello "world")`))).toBe(42);
  expect(console_value).toBe("Hello world")
  expect(toJS(itrp.eval(`(hello2 "WORLD")`))).toBe("HELLO WORLD");
});

test('Suspend / serialize / deserialize / resume and toJS.', () => {
  // Suspend
  const itrp = new Interpreter(); // Create interpreter.

  // Suspend
  let suspend: SuspendEnvelope | null = null;
  try {
    itrp.eval(`(+ 11 (suspend "SUSPEND HERE"))`);
  } catch (e) {
    if (isSuspendEnvelope(e)) {
      suspend = e;
    } else {
      throw e;
    }
  }
  if (suspend) {
    console__log(toJS(suspendValueFromEnvelope(suspend)));
    expect(console_value).toBe("SUSPEND HERE");

    // Serialize/Deserialize
    const json = toReferentialJSON(suspend, "$$$");
    const revived: LISP.Suspend = fromReferentialJSON(json, "$$$");

    // Resume
    const ret = itrp.resume(revived, create.Number(31));
    console__log(toJS(ret)); // => 42
    expect(console_value).toBe(42);
  } else {
    expect("Here").toBe("Never");
  }
});
