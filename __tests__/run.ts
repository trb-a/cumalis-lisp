// This file is ignored by "yarn test".
// Run this file "yarn test:run" instead.

import fs from "fs";
import { writeObject } from "../src";
import { Interpreter } from "../src/interpreter";
const source = fs.readFileSync("./__tests__/run.scm").toString();
const logger = console;
const itrp = new Interpreter({fs});
logger.log("------------[start of run]-------------");
try {
  const ret = itrp.eval(source);
  logger.log("------------[result]-------------");
  logger.log(writeObject(ret, { maxdepth: 30, labels: "simple" }));
} catch (e) {
  if (e instanceof Error) {
    logger.log("ERROR\n", e.name, e.message, "\n", e.stack);
  } else {
    logger.log("EXCEPTION\n", typeof e, e);
  }
  throw e;
}
logger.log("------------[end of run]-------------");
