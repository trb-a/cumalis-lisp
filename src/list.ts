// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.4. Pairs and lists" are defined in this file.

import { eqQ, equalQ, eqvQ } from "./equivalence";
import { LISP } from "./types";
import { assert, create, is, defineBuiltInProcedure, forms, arrayToList, listToArray, pairToArrayWithEnd } from "./utils";

const pairQ = defineBuiltInProcedure("pair?", [
  {name: "obj"},
], ({obj}) => {
  assert.Object(obj);
  return create.Boolean(is.Pair(obj));
});

const cons = defineBuiltInProcedure("cons", [
  {name: "obj1"},
  {name: "obj2"},
], ({obj1, obj2}) => {
  assert.Object(obj1);
  assert.Object(obj2);
  return create.Pair(obj1, obj2);
});

const car = defineBuiltInProcedure("car", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return pair[1];
});

const cdr = defineBuiltInProcedure("cdr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return pair[2];
});

const setCarD = defineBuiltInProcedure("set-car!", [
  {name: "pair"},
  {name: "obj"},
], ({pair, obj}) => {
  assert.Pair(pair);
  assert.Object(obj);
  if (pair[3]) {
    throw create.Error("immutable-object", `Specified list is immutable`);
  }
  pair[1] = obj;
  return pair;
});

const setCdrD = defineBuiltInProcedure("set-cdr!", [
  {name: "pair"},
  {name: "obj"},
], ({pair, obj}) => {
  assert.Pair(pair);
  assert.Object(obj);
  if (pair[3]) {
    throw create.Error("immutable-object", `Specified list is immutable`);
  }
  pair[2] = obj;
  return pair;
});

const caar = defineBuiltInProcedure("caar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  assert.Pair(pair[1])
  return pair[1][1];
});

// Note: car of cdr
const cadr = defineBuiltInProcedure("cadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  assert.Pair(pair[2])
  return pair[2][1];
});

// Note: cdr of car
const cdar = defineBuiltInProcedure("cdar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  assert.Pair(pair[1])
  return pair[1][2];
});

// Note: cdr of cdr
const cddr = defineBuiltInProcedure("cddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  assert.Pair(pair[2])
  return pair[2][2];
});

// cxr library
// (caaar pair)
// (caadr pair)
// ...
// (cdddar pair)
// (cddddr pair)

const nullQ = defineBuiltInProcedure("null?", [
  {name: "obj"},
], ({obj}) => {
  assert.Object(obj);
  return create.Boolean(is.Null(obj));
});

// Note: Checks the list has limited length and ends with <null>.
const listQ = defineBuiltInProcedure("list?", [
  {name: "obj"},
], ({obj}) => {
  assert.Object(obj);
  if (!is.List(obj)) {
    return create.Boolean(false);
  }
  if (is.Null(obj)) {
    return create.Boolean(true);
  }
  try {
    const [, end] = pairToArrayWithEnd(obj);
    return create.Boolean(is.Null(end));
  } catch(e) {
    return create.Boolean(false);
  }
});

const makeList = defineBuiltInProcedure("make-list", [
  {name: "k"},
  {name: "fill", type: "optional"},
], ({k, fill}) => {
  assert.IntegerNumber(k);
  if (fill) {
    assert.Object(fill);
    return create.List(...Array.from({ length: k[1] }, () => (fill)))
  } else {
    return create.List(...Array.from({ length: k[1] }, () => (["<undefined>"] as LISP.Undefined)))
  }
});

const list = defineBuiltInProcedure("list", [
  {name: "objs", type: "variadic"},
], ({objs}) => {
  assert.Objects(objs);
  return create.List(...objs);
});

const length = defineBuiltInProcedure("length", [
  {name: "list"},
], ({list}) => {
  assert.List(list);
  return create.Number(listToArray(list).length);
});

// Note: If the lists are not proper list, the last cdr will be just discarded
// except the last argument.
export const append = defineBuiltInProcedure("append", [
  {name: "args", type: "variadic"},
], ({args}) => {
  assert.Objects(args);
  if (args.length === 0) {
    return ["<null>"];
  } else if (args.length === 1) {
    return args[0];
  } else {
    const [rest, last] = [args.slice(0, args.length - 1), args[args.length -1]];
    assert.Lists(rest);
    return arrayToList(rest.map(list=>listToArray(list)).flat(), last)
  }
});

// Note: If the list is not proper list, the last cdr will be just discarded.
const reverse =  defineBuiltInProcedure("reverse", [
  {name: "list"},
], ({list}) => {
  assert.List(list);
  return create.List(...listToArray(list).reverse());
});

// Note: returns list (or any object) itself if k is zero.
const listTail =  defineBuiltInProcedure("list-tail", [
  {name: "list"},
  {name: "k"},
], ({list, k}) => {
  assert.Object(list);
  assert.IntegerNumber(k);
  if (k[1] === 0) {
    return list;
  }
  assert.List(list);
  for (let curr: LISP.Object = list, i = 0; is.Pair(curr); curr = curr[2], i++) {
    if (i === k[1]) {
      return curr;
    }
  }
  throw create.Error("out-of-range", `Specified list is shorter than specified number ${k[1]}`);
});

const listRef =  defineBuiltInProcedure("list-ref", [
  {name: "list"},
  {name: "k"},
], ({list, k}) => {
  assert.Pair(list);
  assert.IntegerNumber(k);
  for (let curr: LISP.Object = list, i = 0; is.Pair(curr); curr = curr[2], i++) {
    if (i === k[1]) {
      return curr[1];
    }
  }
  throw create.Error("out-of-range", `Specified list is shorter than specified number ${k[1]}`);
});

const listSetD =  defineBuiltInProcedure("list-set!", [
  {name: "list"},
  {name: "k"},
  {name: "obj"},
], ({list, k, obj}) => {
  assert.Pair(list);
  assert.IntegerNumber(k);
  assert.Object(obj);
  for (let curr: LISP.Object = list, i = 0; is.Pair(curr); curr = curr[2], i++) {
    if (i === k[1]) {
      if (curr[3]) {
        throw create.Error("immutable-object", `Specified list is immutable`);
      }
      curr[1] = obj;
      return ["<undefined>"];
    }
  }
  throw create.Error("out-of-range", `Specified list is shorter than specified number ${k[1]}`);
});

const memq =  defineBuiltInProcedure("memq", [
  {name: "obj"},
  {name: "list"},
], ({ obj, list}) => {
  assert.Object(obj);
  assert.List(list);
  const foundIndex = listToArray(list).findIndex(
    item => (eqQ.body({obj1: obj, obj2: item}) as LISP.Boolean)[1]
  );
  if (foundIndex < 0) {
    return create.Boolean(false);
  } else {
    return listTail.body({list, k: create.Number(foundIndex)});
  }
});

const memv =  defineBuiltInProcedure("memv", [
  {name: "obj"},
  {name: "list"},
], ({ obj, list}) => {
  assert.Object(obj);
  assert.List(list);
  const foundIndex = listToArray(list).findIndex(
    item => (eqvQ.body({obj1: obj, obj2: item}) as LISP.Boolean)[1]
  );
  if (foundIndex < 0) {
    return create.Boolean(false);
  } else {
    return listTail.body({list, k: create.Number(foundIndex)});
  }
});

const member =  defineBuiltInProcedure("member", [
  { name: "obj" },
  { name: "list" },
  { name: "compare", type: "optional" },
], ({ obj, list, compare }) => {
  assert.Object(obj);
  assert.List(list);
  if (is.Null(list)) {
    return create.Boolean(false);
  } else if (!compare) {
    const foundIndex = listToArray(list).findIndex(
      item => (equalQ.body({obj1: obj, obj2: item}) as LISP.Boolean)[1]
    );
    if (foundIndex < 0) {
      return create.Boolean(false);
    } else {
      return forms.Quote(listTail.body({list, k: create.Number(foundIndex)}) as LISP.Object);
    }
  } else {
    assert.Procedure(compare);
    const [, current, next] = list;
    return forms.If(
      forms.Call(compare, current, obj),
      list,
      forms.CallBuiltIn("member", obj, next, compare)
    );
  }
}, true);

const assq =  defineBuiltInProcedure("assq", [
  {name: "obj"},
  {name: "alist"},
], ({ obj, alist}) => {
  assert.Object(obj);
  assert.List(alist);
  const found = listToArray(alist).find(
    item => {
      assert.Pair(item);
      return eqQ.body({obj1: obj, obj2: item[1]})[1];
    }
  );
  return found ?? create.Boolean(false);
});

const assv =  defineBuiltInProcedure("assv", [
  {name: "obj"},
  {name: "alist"},
], ({ obj, alist}) => {
  assert.Object(obj);
  assert.List(alist);
  const found = listToArray(alist).find(
    item => {
      assert.Pair(item);
      return eqvQ.body({obj1: obj, obj2: item[1]})[1];
    }
  );
  return found ?? create.Boolean(false);
});

const assoc =  defineBuiltInProcedure("assoc", [
  { name: "obj" },
  { name: "alist" },
  { name: "compare", type: "optional" },
], ({ obj, alist, compare }) => {
  assert.Object(obj);
  assert.List(alist);
  if (is.Null(alist)) {
    return create.Boolean(false);
  } else if (!compare) {
    const found = listToArray(alist).find(
      item => {
        assert.Pair(item);
        return equalQ.body({obj1: obj, obj2: item[1]})[1];
      }
    );
    return found ? forms.Quote(found) : create.Boolean(false);
  } else {
    assert.Procedure(compare);
    const [, current, next] = alist;
    assert.Pair(current);
    return forms.If(
      forms.Call(compare, create.MultiValue([current[1], obj])),
      forms.Quote(current),
      forms.CallBuiltIn("assoc", create.MultiValue([obj, next, compare])),
    );
  }
}, true);


const listCopy = defineBuiltInProcedure("list-copy", [
  {name: "obj"},
], ({obj}) => {
  assert.Object(obj);
  if (!is.List(obj)) {
    return obj;
  } else if (is.Null(obj)) {
    return ["<null>"];
  } else {
    const [cars, end] = pairToArrayWithEnd(obj);
    return arrayToList(cars, end);
  }
});

export const procedures = {
  pairQ, cons, car, cdr, setCarD, setCdrD, caar, cadr, cdar, cddr,
  nullQ, listQ, makeList, list, length, append, reverse, listTail,
  listRef, listSetD, memq, memv, member, assq, assv, assoc, listCopy
};
