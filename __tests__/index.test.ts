/* eslint-disable */
import fs from "fs";
import { assert, contentCS, create, defineBuiltInProcedure, forms, is } from "../src/utils";
// import { fromReferentialJSON, toReferentialJSON } from "../src/utils";
import { equalQ } from "../src/equivalence";
import { writeString } from "../src/port";
import { writeObject } from "../src/unparser";
import { Interpreter } from "../src/interpreter";

const logger = console; // To avoid to type console dot log.
const r7rsTest = fs.readFileSync("./__tests__/r7rs.scm").toString();

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
  };
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

// Note: this is not enough implementation.
// Just for testing.
const displayProc = defineBuiltInProcedure("display", [
  { name: "obj"},
  { name: "port", type: "optional"}
], ({obj, port}, itrp, stack) => {
  assert.Object(obj);
  const str = create.String(writeObject(obj).replace(/^"|"$/g, ""), false);
  writeString.body({str, port}, itrp, stack);
  return ["<undefined>"];
});

itrp.setBuiltInProcedure(testProc);
itrp.setBuiltInProcedure(test1Proc);
itrp.setBuiltInProcedure(testValuesProc);
itrp.setBuiltInProcedure(testValues1Proc);
itrp.setBuiltInProcedure(testBeginProc);
itrp.setBuiltInProcedure(testEndProc);
itrp.setBuiltInProcedure(displayProc);

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

test('Results', () => {
  expect(failCount).toBe(0);
});
