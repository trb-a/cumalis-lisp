import fs from "fs";
import { assert, contentCS, create, defineBuiltInProcedure, forms, fromReferentialJSON, is, isSuspendEnvelope, suspendValueFromEnvelope, toReferentialJSON } from "../src/utils";
import { equalQ } from "../src/equivalence";
import { toJS, writeObject } from "../src/unparser";
import { Envelope, Interpreter } from "../src/interpreter";
import { LISP } from "../src/types";

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

test('suspend / serialize / deserialize / resume and toJS.', () => {
  // Suspend
  let suspend: Envelope;
  try {
    itrp.eval(`(+ 11 (suspend 100))`);
  } catch (e) {
    suspend = e;
  }
  expect(isSuspendEnvelope(suspend)).toBe(true);
  if (!isSuspendEnvelope(suspend)) {
    return;
  }
  expect(toJS(suspendValueFromEnvelope(suspend))).toBe(100);

  // Serialize/Deserialize
  const json = toReferentialJSON(suspend, "$$$");
  const revived: LISP.Suspend = fromReferentialJSON(json, "$$$");
  expect(isSuspendEnvelope(revived)).toBe(true);
  if(!isSuspendEnvelope(revived)) {
    return;
  }
  expect(toJS(suspendValueFromEnvelope(revived))).toBe(100);

  // Resume
  const ret = itrp.resume(revived, create.Number(31));
  expect(toJS(ret)).toBe(42);
});
