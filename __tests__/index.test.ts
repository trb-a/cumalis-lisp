/* eslint-disable jest/no-conditional-expect */
import fs from "fs";
import { assert, contentCS, create, defineBuiltInProcedure, ExitEnvelope, exitValueFromEnvelope, forms, fromReferentialJSON, is, isExitEnvelope, isSuspendEnvelope, numberToJSNumber, SuspendEnvelope, suspendValueFromEnvelope, toReferentialJSON, uuidv4 } from "../src/utils";
import { equalQ } from "../src/equivalence";
import { toJS, writeObject } from "../src/unparser";
import { Interpreter } from "../src/interpreter";
import { LISP } from "../src/types";
import { fromJS } from "../src";

const logger = console; // To avoid to type console dot log.
const r7rsTest = fs.readFileSync("./__tests__/r7rs.scm").toString();
const fileTest = fs.readFileSync("./__tests__/file.scm").toString();

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
    failCount++;
    logger.log("******** <<<< [[ NG! ]] >>>> **********");
  }
  return ["<undefined>"];
});

const testRoundProc = defineBuiltInProcedure("test-round", [
  {name: "tobe", evaluate: false},
  {name: "target", evaluate: false},
], ({tobe, target}, _itrp, stack) => {
  assert.Object(tobe);
  assert.Object(target);
  const info = contentCS(stack).info;
  logger.log(
    writeObject(target) + " =(round)= " + writeObject(tobe) + "\n" +
    JSON.stringify(info)
  );
  return forms.CallBuiltIn("test-round-1", tobe, target);
}, true);

// Note: Only for this test.
const testRound1Proc = defineBuiltInProcedure("test-round-1", [
  {name: "tobe"},
  {name: "target"},
], ({tobe, target}) => {
  assert.Object(tobe);
  assert.Object(target);
  if (is.Number(tobe) && is.Number(target)) {
    if (Math.round(numberToJSNumber(tobe) * 1000) === Math.round(numberToJSNumber(target) * 1000)) {
      logger.log("OK!");
    } else {
      failCount++;
      logger.log("******** <<<< [[ NG! ]] >>>> **********" + "\nReturned value:" + writeObject(target));
    }
  } else {
    failCount++;
    logger.log("******** <<<< [[ NG! (Not number) ]] >>>> **********");
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
itrp.setBuiltInProcedure(testRoundProc);
itrp.setBuiltInProcedure(testRound1Proc);
itrp.setBuiltInProcedure(testBeginProc);
itrp.setBuiltInProcedure(testEndProc);

test('R7RS Test', () => {
  try {
    itrp.eval(r7rsTest);
  } catch (e) {
    if (e instanceof Error) {
      logger.log("JS EXCEPTOION", e.name, e.message, "\n", e.stack);
    } else {
      logger.log("ERROR\n", typeof e, e);
    }
    throw e;
  }
  logger.log(`EXECUTED ${testCount} tests. FAILED: ${failCount}`)
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

test('Exit / Emergency exit', () => {
  let flag = 0;
  const itrp = new Interpreter(); // Create interpreter.
  itrp.setBuiltInProcedure(defineBuiltInProcedure("set-flag1", [], () => {
    flag = 1;
    return ["<undefined>"];
  }));
  itrp.setBuiltInProcedure(defineBuiltInProcedure("set-flag2", [], () => {
    flag = 2;
    return ["<undefined>"];
  }));

  let exit: ExitEnvelope | null = null;
  try {
    itrp.eval(`
      (import (scheme process-context))
      (dynamic-wind
        (lambda () (set-flag1))
        (lambda () (exit "EXIT HERE"))
        (lambda () (set-flag2))
      )
    `);
  } catch (e) {
    if (isExitEnvelope(e)) {
      exit = e;
    } else {
      throw e;
    }
  }
  expect(flag).toBe(2);
  if (exit) {
    expect(toJS(exitValueFromEnvelope(exit))).toBe("EXIT HERE");
  } else {
    expect("Here").toBe("Never");
  }

  try {
    itrp.eval(`
      (import (scheme process-context))
      (dynamic-wind
        (lambda () (set-flag1))
        (lambda () (emergency-exit "EMARGENCY HERE"))
        (lambda () (set-flag2))
      )
    `);
  } catch (e) {
    if (isExitEnvelope(e)) {
      exit = e;
    } else {
      throw e;
    }
  }
  expect(flag).toBe(1);
  if (exit) {
    expect(toJS(exitValueFromEnvelope(exit))).toBe("EMARGENCY HERE");
  } else {
    expect("Here").toBe("Never");
  }
});

//--------------------------
//      File test
//--------------------------

import os from "os";

const tempDir = os.tmpdir();
// CHECK SANITY
if (tempDir.length < 10) {
  throw new Error("Not enough length of tempdir");
}
process.env["MY_TEMPDIR"] = tempDir;
process.env["MY_FILE"] = tempDir + "/" + uuidv4();

test('File Test', () => {
  failCount = 0;
  testCount = 0;
    try {
    itrp.eval(fileTest);
  } catch (e) {
    if (e instanceof Error) {
      logger.log("JS EXCEPTOION", e.name, e.message, "\n", e.stack);
    } else {
      logger.log("ERROR\n", typeof e, e);
    }
    throw e;
  }
  logger.log(`EXECUTED ${testCount} tests. FAILED: ${failCount}`)
  expect(failCount).toBe(0);
});

//--------------------------
//    (scheme load) test
//--------------------------


test('Load Test', () => {
  const tempFilename = tempDir.replace(/\\/g, "/") + "/" + uuidv4();
  const data = "(+ 100 200)";
  fs.writeFileSync(tempFilename, data);
  try {
    // Note: Return value of (load ...) is not defined R7RS.
    expect(toJS(itrp.eval(`
      (import (scheme load))
      (load "${tempFilename}")
    `))).toBe(300);
  } catch (e) {
    if (e instanceof Error) {
      logger.log("JS EXCEPTOION", e.name, e.message, "\n", e.stack);
    } else {
      logger.log("ERROR\n", typeof e, e);
    }
    throw e;
  } finally {
    fs.unlinkSync(tempFilename);
  }
});
