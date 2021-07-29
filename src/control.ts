// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.10. Control features" are defined in this file.

import { LISP } from "./types";
import { assertNonNull, assert, create, is, defineBuiltInProcedure, defineBuiltInProcedureAlias, forkCS, forms, listToArray, parentCS, transferCS } from "./utils";

const procedureQ = defineBuiltInProcedure("procedure?", [
  {name: "obj"},
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Procedure(obj));
}, true);

// Note: "apply" returns a multiple-value object to skip evaluating arguments of the given procedure.
const apply = defineBuiltInProcedure("apply", [
  {name: "proc"},
  {name: "args", type: "variadic"},
], ({ proc, args }, itrp, stack) => {
  assert.Procedure(proc);
  assert.Objects(args);
  assertNonNull(itrp)
  assertNonNull(stack)
  let argsArray: LISP.Object[];
  if (args.length === 0) {
    argsArray = [];
  } else {
    const [rest, last] = [args.slice(0, args.length -1), args[args.length -1]];
    assert.List(last);
    argsArray = [...rest, ...listToArray(last)];
  }
  return forms.Call(proc, create.MultiValue(argsArray));
}, true);

const map = defineBuiltInProcedure("map", [
  { name: "proc" },
  { name: "list1" },
  { name: "lists", type: "variadic" }
], ({ proc, list1, lists }) => {
  assert.Procedure(proc);
  assert.List(list1);
  assert.Lists(lists);
  const arr = [list1, ...lists];
  if (arr.every((a): a is LISP.Pair => is.Pair(a))) {
    return forms.Cons(
      // Note: MultValue works as if quoting all the arguments faster.
      forms.Call(proc, create.MultiValue(arr.map(a => a[1]))),
      forms.CallBuiltIn("map", create.MultiValue([proc, ...arr.map(a => a[2])]))
    );
  } else {
    return forms.Quote(["<null>"]);
  }
}, true);

const stringMap = defineBuiltInProcedure("string-map", [
  { name: "proc" },
  { name: "str1" },
  { name: "strs", type: "variadic" }
], ({ proc, str1, strs }) => {
  assert.Procedure(proc);
  assert.String(str1);
  assert.Strings(strs);
  const arr = [str1, ...strs];
  if (arr.every(str => str[1].length > 1)) {
    return forms.CallBuiltIn("string-append",
      forms.CallBuiltIn("string", forms.Call(proc, ...arr.map(str => create.Character(str[1][0])))),
      forms.CallBuiltIn("string-map", proc, ...arr.map(str => create.String(str[1].slice(1), false)))
    );
  } else if (arr.every(str => str[1].length === 1)) {
    return forms.CallBuiltIn("string",
      forms.Call(proc, ...arr.map(str => create.Character(str[1][0]))),
    );
  } else {
    return create.String("", false);
  }
}, true);

const vectorMap = defineBuiltInProcedure("vector-map", [
  { name: "proc" },
  { name: "vector1" },
  { name: "vectors", type: "variadic" }
], ({ proc, vector1, vectors }) => {
  assert.Procedure(proc);
  assert.Vector(vector1);
  assert.Vectors(vectors);
  const arr = [vector1, ...vectors];
  if (arr.every(vec => vec[1].length > 1)) {
    return forms.CallBuiltIn("vector-append",
      // Note: MultValue works as if quoting all the arguments faster.
      forms.CallBuiltIn("vector", forms.Call(proc, create.MultiValue(arr.map(vec => vec[1][0])))),
      forms.CallBuiltIn("vector-map", proc, ...arr.map(vec => create.Vector(vec[1].slice(1), false)))
    );
  } else if (arr.every(vec => vec[1].length >= 1)) {
    return forms.CallBuiltIn("vector", forms.Call(proc, create.MultiValue(arr.map(vec => vec[1][0]))));
  } else {
    return create.Vector([], false);
  }
}, true);

const forEach = defineBuiltInProcedure("for-each", [
  { name: "proc" },
  { name: "list1" },
  { name: "lists", type: "variadic" }
], ({ proc, list1, lists }) => {
  assert.Procedure(proc);
  assert.List(list1);
  assert.Lists(lists);
  const arr = [list1, ...lists];
  if (arr.every((a): a is LISP.Pair => is.Pair(a))) {
    return forms.Begin(
      forms.Call(proc, create.MultiValue(arr.map(a => a[1]))),
      forms.CallBuiltIn("for-each", create.MultiValue([proc, ...arr.map(a => a[2])])),
    );
  } else {
    return ["<undefined>"];
  }
}, true);

const stringForEach = defineBuiltInProcedure("string-for-each", [
  { name: "proc" },
  { name: "str1" },
  { name: "strs", type: "variadic" }
], ({ proc, str1, strs }) => {
  assert.Procedure(proc);
  assert.String(str1);
  assert.Strings(strs);
  const arr = [str1, ...strs];
  if (arr.every(str => str[1].length > 1)) {
    return forms.Begin(
      forms.Call(proc, ...arr.map(str => create.Character(str[1][0]))),
      forms.CallBuiltIn("string-for-each", proc, ...arr.map(str => create.String(str[1].slice(1), false)))
    );
  } else if (arr.every(str => str[1].length === 1)) {
    return forms.Call(proc, ...arr.map(str => create.Character(str[1][0])));
  } else {
    return ["<undefined>"];
  }
}, true);


const vectorForEach = defineBuiltInProcedure("vector-for-each", [
  { name: "proc" },
  { name: "vector1" },
  { name: "vectors", type: "variadic" }
], ({ proc, vector1, vectors }) => {
  assert.Procedure(proc);
  assert.Vector(vector1);
  assert.Vectors(vectors);
  const arr = [vector1, ...vectors];
  if (arr.every(vec => vec[1].length > 1)) {
    return forms.Begin(
      forms.Call(proc, create.MultiValue(arr.map(vec => vec[1][0]))),
      forms.CallBuiltIn("vector-for-each", proc, ...arr.map(vec => create.Vector(vec[1].slice(1), false)))
    );
  } else if (arr.every(vec => vec[1].length === 1)) {
    return forms.Call(proc, create.MultiValue(arr.map(vec => vec[1][0])));
  } else {
    return forms.Quote(["<null>"]);
  }
}, true);

// Note: proc is requsted for for proper TCO by R7RS.
const callWithCurrentContinuation = defineBuiltInProcedure("call-with-current-continuation", [
  {name: "proc"}
], ({proc}, _itrp, stack) => {
  assert.Procedure(proc);
  assertNonNull(stack);
  return forms.Call(proc, create.Continuation(parentCS(stack)!))
}, true);

const callCC = defineBuiltInProcedureAlias("call/cc", callWithCurrentContinuation);

const values = defineBuiltInProcedure("values", [
  { name: "objs", type: "variadic" }
], ({ objs }) => {
  assert.Objects(objs);
  return objs.length === 1 ? objs[0] : create.MultiValue(objs);
});

// R7RS saids: Calls its producer argument with no arguments and a
// continuation that, when passed some values, calls the
// consumer procedure with those values as arguments. The
// continuation for the call to consumer is the continuation
// of the call to call-with-values.
const callWithValues = defineBuiltInProcedure("call-with-values", [
  { name: "producer" },
  { name: "consumer" }
], ({ producer, consumer }, _itrp, stack) => {
  assert.Procedure(producer);
  assert.Procedure(consumer);
  assertNonNull(stack);
  const consumerCS = transferCS(stack, create.List(consumer), { want: "args", oper: consumer });
  const producerCS = forkCS(consumerCS, create.List(producer));
  return producerCS;
});

// Note: R7RS doesn't request for proper tail-call recursion for dynamic-wind.
const dynamicWind = defineBuiltInProcedure("dynamic-wind", [
  { name: "before" },
  { name: "thunk" },
  { name: "after" },
], ({ before, thunk, after }, _itrp, stack) => {
  assert.Procedure(before);
  assert.Procedure(thunk);
  assert.Procedure(after);
  assertNonNull(stack);
  const cont = create.Continuation(parentCS(stack)!);
  return forkCS(stack, forms.Begin(
    forms.Call(before),
    forms.Call(cont, forms.Call(thunk)),
  ), { before, after });
});

export const procedures = {
 procedureQ, apply, map, stringMap, vectorMap, forEach, stringForEach, vectorForEach,
 callWithCurrentContinuation, callCC, values, callWithValues, dynamicWind
};


