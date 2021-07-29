// Special procedures/syntaxes in base-library introduced by R7RS
// Chapter "5. Program structure" are defined in this file.


import { eqvQ } from "./equivalence";
import { LISP } from "./types";
import { assertNonNull, assert, is,  contentStack, create, forms, defineBuiltInProcedure, formalsToParameters, listToArray, contentCS } from "./utils";

// ------------------------------------------------

// Library features are not supported yet.
// import

const define = defineBuiltInProcedure("define", [
  { name: "arg1", evaluate: false },
  { name: "arg2", type: "variadic", evaluate: false }
], ({ arg1, arg2 }, itrp, stack): LISP.Object => {
  assert.Object(arg1);
  assert.Objects(arg2);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = contentCS(stack).depth <= 1;
  if (is.Symbol(arg1)) {
    const symbol = arg1;
    const [init] = arg2;
    if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[symbol[1]] ?? ["<undefined>"])) {
      throw create.Error("redefine-variable", null);
    }
    itrp.defineStatic(contentCS(stack).env.static, symbol, ["<undefined>"]);
    return forms.Set(symbol, init);
  } else {
    assert.Pair(arg1);
    const [[, symbol, formals], body] = [arg1, arg2];
    assert.Symbol(symbol);
    assert.List(formals);
    if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[symbol[1]] ?? ["<undefined>"])) {
      throw create.Error("redefine-variable", null);
    }
    const [ups, vp] = formalsToParameters(formals);
    itrp.defineStatic(contentCS(stack).env.static, symbol,
      create.Procedure(
        "lambda",
        vp ? [...ups, vp] : ups,
        forms.BeginIfMultiple(...body),
        false,
        contentCS(stack).env
      )
    );
    return ["<undefined>"];
  }
}, true);

const defineValues = defineBuiltInProcedure("define-values", [
  { name: "formals", evaluate: false },
  { name: "expr" }
], ({ formals, expr }, itrp, stack): LISP.Object => {
  assert.Object(formals);
  assert.Object(expr);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = contentCS(stack).depth <= 1;
  const [ups, vp] = formalsToParameters(formals);
  const args = is.MultiValue(expr) ? expr[1] : [expr];
  for (let i = 0; i < ups.length; i++) {
    if (!args[i]) {
      throw create.Error("arity-error", null);
    }
    if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[ups[i].name] ?? ["<undefined>"])) {
      throw create.Error("redefine-variable", null);
    }
    itrp.defineStatic(contentCS(stack).env.static, create.Symbol(ups[i].name), args[i]);
  }
  if (vp) {
    itrp.defineStatic(contentCS(stack).env.static, create.Symbol(vp.name), create.List(...args.slice(ups.length)));
  }
  return ["<undefined>"];
});

// Create a macro procedure that wraps "use-syntax-rules" and a syntax-rule.
// Note: arguments are evaluated in the caller's environment.
// Not only the wrapper procedure,"literal-identifiers" are defined as a
// variable with undefined value if the variable is not defined. This enables
// evaluation of arguments and matching with the identifier.
const defineSyntax = defineBuiltInProcedure("define-syntax", [
  { name: "keyword", evaluate: false },
  { name: "spec" }
], ({ keyword, spec }, itrp, stack): LISP.Object => {
  assert.Symbol(keyword);
  assert.SyntaxRules(spec);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = contentCS(stack).depth <= 1;
  if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[keyword[1]] ?? ["<undefined>"])) {
    throw create.Error("redefine-variable", null);
  }
  const proc = create.Procedure("lambda",
    [{ name: "exprs", type: "variadic", evaluate: false }],
    forms.CallBuiltIn("use-syntax-rules",
      spec,
      create.Symbol("exprs"),
    ),
    true, // as macro.
    contentCS(stack).env
  );
  itrp.defineStatic(contentCS(stack).env.static, keyword, proc);
  return ["<undefined>"];
});

const defineRecordType = defineBuiltInProcedure("define-record-type", [
  { name: "name", evaluate: false },
  { name: "ctor", evaluate: false },
  { name: "pred", evaluate: false },
  { name: "fields", evaluate: false, type: "variadic" }
], ({ name, ctor, pred, fields }, itrp, stack): LISP.Object => {
  assert.Symbol(name);
  assert.Pair(ctor);
  assert.Symbol(pred);
  assert.Pairs(fields);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = contentCS(stack).depth <= 1;
  if (!isTopLevel && (
    !is.Undefined(contentStack(contentCS(stack).env.static)[name[1]] ?? ["<undefined>"]) ||
    !is.Undefined(contentStack(contentCS(stack).env.static)[pred[1]] ?? ["<undefined>"])
  )) {
    throw create.Error("redefine-variable", null);
  }

  // Environment for procedures.
  const env = contentCS(stack).env;

  // Create <record-type> object.
  const type = create.RecordType(name[1]);

  // Define constructor procedure
  const [cname, ...cparams] = listToArray(ctor);
  assert.Symbol(cname);
  assert.Symbols(cparams);
  {
    const vrec = create.Symbol("rec"); // as variable
    itrp.defineStatic(contentCS(stack).env.static, cname,
      create.Procedure("lambda", cparams.map(i => ({name: i[1]})),
      forms.BeginIfMultiple(
        forms.Define(vrec, forms.CallBuiltIn("make-record", type)),
        ...cparams.map(cparam => forms.CallBuiltIn("record-set!", vrec, cparam, cparam)),
        vrec
      ), false, env)
    );
  }
  // Define predicate procedure.
  {
    const vrec = create.Symbol("rec"); // as variable
    itrp.defineStatic(contentCS(stack).env.static, pred,
      create.Procedure("lambda", [{ name: vrec[1] }], (
        forms.CallBuiltIn("record-type?", vrec, type)
      ), false, env)
    );
  }
  for (const field of fields) {
    const [fname, aname, mname] = listToArray(field);
    assert.Symbol(fname);
    assert.Symbol(aname);
    if (!cparams.some(cp => cp[1] === fname[1])) {
      throw create.Error("domain-error", "Unknown field name");
    }
    // Define accessor procedure.
    {
      if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[aname[1]] ?? ["<undefined>"])) {
        throw create.Error("redefine-variable", null);
      }
      const vrec = create.Symbol("rec"); // as variable
      itrp.defineStatic(contentCS(stack).env.static, aname,
        create.Procedure("lambda", [{ name: vrec[1] }], (
          forms.CallBuiltIn("record-get", vrec, fname)
        ), false, env)
      );
    }
    // Define modifier procedure.
    if (mname) {
      assert.Symbol(mname);
      if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[mname[1]] ?? ["<undefined>"])) {
        throw create.Error("redefine-variable", null);
      }
      const vrec = create.Symbol("rec"); // as variable
      const vvalue = create.Symbol("value"); // as variable
      itrp.defineStatic(contentCS(stack).env.static, mname,
        create.Procedure("lambda", [{ name: vrec[1] }, { name: vvalue[1] }], (
          forms.CallBuiltIn("record-set!", vrec, fname, vvalue)
        ), false, env)
      );
    }
  }
  return ["<undefined>"];
});

// Hidden procedure
const makeRecord = defineBuiltInProcedure("make-record", [
  { name: "type" },
], ({ type }): LISP.Object => {
  assert.RecordType(type);
  return create.Record(type, {})
}, false, true);

// Hidden procedure
const recordTypeQ = defineBuiltInProcedure("record-type?", [
  { name: "rec" },
  { name: "type" },
], ({ rec, type }): LISP.Object => {
  assert.Object(rec);
  assert.RecordType(type);
  if (is.Record(rec)) {
    return eqvQ.body({obj1: rec[1], obj2: type});
  } else {
    return create.Boolean(false);
  }
}, false, true);

// Hidden procedure
const recordGet = defineBuiltInProcedure("record-get", [
  { name: "rec" },
  { name: "field", evaluate: false},
], ({ rec, field }): LISP.Object => {
  assert.Record(rec);
  assert.Symbol(field);
  const ret = rec[2][field[1]] ?? ["<undefined>"];
  return ret;
}, false, true);

// Hidden procedure
const recordSetD = defineBuiltInProcedure("record-set!", [
  { name: "rec" },
  { name: "field", evaluate: false},
  { name: "value"},
], ({ rec, field, value }): LISP.Object => {
  assert.Record(rec);
  assert.Symbol(field);
  assert.Object(value);
  if (is.Undefined(value)) {
    throw create.Error("undefined-value", "Attempt to set an undefined value.");
  }
  rec[2][field[1]] = value;
  return ["<undefined>"];
}, false, true);

// Library feature is not supported yet.
// define-library

export const procedures = {
  define, defineValues, defineSyntax, defineRecordType,
  makeRecord, recordTypeQ, recordGet, recordSetD,
};
