import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { create, defineBuiltInProcedure } from "../utils";

const currentSecond = defineBuiltInProcedure("current-second", [
], () => {
  return create.Number(Date.now() / 1000);
}, false, true);

// Note: In node.js, performance object must be exposed to global
// from require('perf_hooks').performance. Otherwise, Date.now() is used instead.
const currentJiffy = defineBuiltInProcedure("current-jiffy", [
], () => {
  const global = Function('return this')();
  return create.Number(Math.round(global["performance"] ? performance.now() : Date.now()));
}, false, true);

const jiffiesPerSecond = defineBuiltInProcedure("jiffies-per-second", [
], () => {
  return create.Number(1000);
}, false, true);

const procedures = [currentSecond, currentJiffy, jiffiesPerSecond];
const TimeLibrary: BuiltInLibraryDefinition = (itrp) => {
  [...procedures].forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default TimeLibrary;


