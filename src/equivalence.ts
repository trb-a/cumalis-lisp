// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.1. Equivalence predicates" are defined in this file.

import { LISP } from "./types";
import { arrayShallowEquals, assert, create, is, defineBuiltInProcedure, defineBuiltInProcedureAlias } from "./utils";

export const eqvQ = defineBuiltInProcedure("eqv?", [
  {name: "obj1"},
  {name: "obj2"},
], ({obj1, obj2}): LISP.Boolean => {
  assert.Object(obj1);
  assert.Object(obj2);

  const modifier = (v: LISP.Object): any[] => {
    // immutable flag and IPair's info can't be included for equality tests.
    if (is.String(v) || is.ByteVector(v) || is.Vector(v)) {
      return (v as any[]).slice(0, v.length -1);
    } else if (is.Pair(v)) {
      return (v as any[]).slice(0, 3);
    } else {
      return v;
    }
  };

  return create.Boolean(
    obj1 === obj2 ||
    arrayShallowEquals(modifier(obj1), modifier(obj2))
  );
});

export const eqQ = defineBuiltInProcedureAlias("eq?", eqvQ);

export const equalQ = defineBuiltInProcedure("equal?", [
  {name: "obj1"},
  {name: "obj2"},
], ({obj1, obj2}): LISP.Boolean => {
  assert.Object(obj1);
  assert.Object(obj2);
  const fn = (obj1: LISP.Object, obj2: LISP.Object): boolean => {
    if (obj1 === obj2) {
      return true;
    } else if (is.Pair(obj1) && is.Pair(obj2)) {
      return fn(obj1[1], obj2[1]) && fn(obj1[2], obj2[2]);
    } else if (is.Vector(obj1) && is.Vector(obj2)) {
      return obj1[1] === obj2[1] || (
        obj1[1].length === obj2[1].length &&
        obj1[1].every((item, idx) => fn(item, obj2[1][idx]))
      );
    } else if (is.ByteVector(obj1) && is.ByteVector(obj2)) {
      return arrayShallowEquals(obj1[1], obj2[1]);
    } else {
      return eqvQ.body({obj1, obj2})[1];
    }
  }
  return create.Boolean(fn(obj1, obj2));
});

export const procedures = {
  eqvQ, eqQ, equalQ,
};
