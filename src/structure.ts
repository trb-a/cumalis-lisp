// Special procedures/syntaxes in base-library introduced by R7RS
// Chapter "5. Program structure" are defined in this file.


import { eqvQ } from "./equivalence";
import { condExpand } from "./expression";
import { readFile } from "./misc";
import { Dictionary, LISP } from "./types";
import { writeObject } from "./unparser";
import { assertNonNull, assert, is, contentStack, create, forms, defineBuiltInProcedure, formalsToParameters, listToArray, contentCS, nextStack, isOneOf, transferCS, forkCS, createCS } from "./utils";

// ------------------------------------------------

export const Import = defineBuiltInProcedure("import", [
  { name: "sets", type: "variadic", evaluate: false }
], ({ sets }, itrp, stack): LISP.Object => {
  assert.Objects(sets);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
  const fn = (set: LISP.Object): Dictionary<LISP.Object> => {
    if (is.Pair(set) && is.Symbol(set[1]) && isOneOf(set[1][1], ["only", "except", "prefix", "rename"] as const)) {
      const modifier = set[1][1];
      const [, innerSet, ...arr] = listToArray(set);
      if (!innerSet) {
        throw create.Error("error", "Illegal import syntax. No import set after only, except, prefix, or rename.");
      }
      if (modifier === "only") {
        assert.Symbols(arr, "Illegal import syntax (only).");
        const result = {} as Dictionary<LISP.Object>;
        for (const [key, value] of Object.entries(fn(innerSet))) {
          if (arr.some(item => item[1] === key)) {
            result[key] = value;
          }
        }
        return result;
      } else if (modifier === "except") {
        assert.Symbols(arr, "Illegal import syntax (except).");
        const result = {} as Dictionary<LISP.Object>;
        for (const [key, value] of Object.entries(fn(innerSet))) {
          if (arr.some(item => item[1] !== key)) {
            result[key] = value;
          }
        }
        return result;
      } else if (modifier === "prefix") {
        if (arr.length !== 0 || !is.Symbol(arr[0])) {
          assert.Symbols(arr, "Illegal import syntax (prefix).");
        }
        const prefix = arr[0][1] as string;
        const result = {} as Dictionary<LISP.Object>;
        for (const [key, value] of Object.entries(fn(innerSet))) {
          result[prefix + key] = value;
        }
        return result;
      } else if (modifier === "rename") {
        const result = fn(innerSet);
        for (const item of arr) {
          assert.Pair(item, "Illegal import syntax (rename).");
          assert.Symbol(item[1], "Illegal import syntax (rename).");
          assert.Pair(item[2], "Illegal import syntax (rename).");
          assert.Symbol(item[2][1], "Illegal import syntax (rename).");
          const [, from, [, to]] = item;
          const value = result[from[1]];
          assertNonNull(value, `Identifier ${from[1]} is not found in the original set.`);
          delete result[from[1]];
          result[to[1]] = value;
        }
        return result;
      } else {
        return {}; // Never.
      }
    } else {
      const name = writeObject(set);
      if (name === "(scheme base)") {
        return {}; // "(scheme base)" is loaded by default.
      }
      const builtin = itrp.getBuiltInLibrary(name);
      if (builtin) {
        return builtin(itrp);
      }
      const library = itrp.getStatic(contentCS(stack).env.static, create.Symbol(name));
      if (is.Library(library)) {
        const result = {} as Dictionary<LISP.Object>;
        const [, libraryMap, libraryEnv] = library;
        for (const [from, to] of Object.entries(libraryMap)) {
          const value = itrp.getStatic(libraryEnv.static, create.Symbol(from));
          if (!value) {
            throw create.Error("error", `Invalid library export "${from[1]}" (exported as "${to[1]}")`);
          }
          result[to] = value;
        }
        return result;
      }
      throw create.Error("error", `Library "${set}" not found.`);
    }
  }
  for (const set of sets) {
    const dict = fn(set);
    for (const name of Object.keys(dict)) {
      if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[name] ?? ["<undefined>"])) {
        throw create.Error("redefine-variable", null);
      }
      itrp.defineStatic(contentCS(stack).env.static, create.Symbol(name), dict[name]);
    }
  }
  return ["<undefined>"];
});

const define = defineBuiltInProcedure("define", [
  { name: "arg1", evaluate: false },
  { name: "arg2", type: "variadic", evaluate: false }
], ({ arg1, arg2 }, itrp, stack): LISP.Object => {
  assert.Object(arg1);
  assert.Objects(arg2);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
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
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
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
// Note: To enable recursive call, define/bind the keyword at first
// and then evaluate "spec" argument using define-syntax-1.
const defineSyntax = defineBuiltInProcedure("define-syntax", [
  { name: "keyword", evaluate: false },
  { name: "spec", evaluate: false }
], ({ keyword, spec }, itrp, stack): LISP.Object => {
  assert.Symbol(keyword);
  assert.Object(spec);
  assertNonNull(itrp);
  assertNonNull(stack);
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
  if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[keyword[1]] ?? ["<undefined>"])) {
    throw create.Error("redefine-variable", null);
  }
  itrp.defineStatic(contentCS(stack).env.static, keyword, create.Undefined());
  return forms.CallBuiltIn("define-syntax-1", keyword, spec);
}, true);

// Hidden procedure
// Support procedure for define-syntax.
const defineSyntax1 = defineBuiltInProcedure("define-syntax-1", [
  { name: "keyword", evaluate: false },
  { name: "spec" }
], ({ keyword, spec }, itrp, stack): LISP.Object => {
  assert.Symbol(keyword);
  assert.SyntaxRules(spec);
  assertNonNull(itrp);
  assertNonNull(stack);
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
}, false, true);

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
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
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
      create.Procedure("lambda", cparams.map(i => ({ name: i[1] })),
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
    return eqvQ.body({ obj1: rec[1], obj2: type });
  } else {
    return create.Boolean(false);
  }
}, false, true);

// Hidden procedure
const recordGet = defineBuiltInProcedure("record-get", [
  { name: "rec" },
  { name: "field", evaluate: false },
], ({ rec, field }): LISP.Object => {
  assert.Record(rec);
  assert.Symbol(field);
  const ret = rec[2][field[1]] ?? ["<undefined>"];
  return ret;
}, false, true);

// Hidden procedure
const recordSetD = defineBuiltInProcedure("record-set!", [
  { name: "rec" },
  { name: "field", evaluate: false },
  { name: "value" },
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

const defineLibrary = defineBuiltInProcedure("define-library", [
  { name: "name", evaluate: false },
  { name: "decls", type: "variadic", evaluate: false },
], ({ name, decls }, itrp, stack) => {
  assert.Object(name);
  assert.Pairs(decls);
  assertNonNull(itrp);
  assertNonNull(stack);
  const nameStr = writeObject(name);
  const isTopLevel = nextStack(contentCS(stack).env.static) ? false : true;
  if (!isTopLevel && !is.Undefined(contentStack(contentCS(stack).env.static)[nameStr] ?? ["<undefined>"])) {
    throw create.Error("redefine-variable", null);
  }
  // Note: This creates new environment.
  // Note: R7RS doesn't say clearly, but hope creating void environment is doing right.
  const newEnv: LISP.Env = contentCS(createCS(create.Undefined())).env;
  // const env = contentCS(stack).env;
  // const newEnv: LISP.Env = { static: addStaticNS(env.static), dynamic: env.dynamic};

  const library = create.Library({}, newEnv);

  const exprs: LISP.Object[] = [];
  const readFilenames: string[] = [];
  const fn = (decls: LISP.Pair[]) => {
    for (const decl of decls) {
      const [, car, cdr] = decl;
      assert.Symbol(car, "Illegal syntax of define-library-syntax");
      if (car[1] === "export") {
        // export
        assert.List(cdr, "Illegal syntax of export.");
        for (const spec of listToArray(cdr)) {
          if (is.Symbol(spec)) {
            // define symbols as default value.
            itrp.defineStatic(newEnv.static, spec, create.Undefined());
            // set the name to <library> object.
            library[1][spec[1]] = spec[1];
          } else if (is.Pair(spec)) {
            if (is.Symbol(spec[1]) && spec[1][1] === "rename" && is.Pair(spec[2]) && is.Pair(spec[2][2])) {
              const [, from, [, to]] = spec[2];
              assert.Symbol(from, "Illegal renaming symbol(from) of export in define-library");
              assert.Symbol(to, "Illegal renaming symbol(to) of export in define-library");
              // define symbols as default value.
              itrp.defineStatic(newEnv.static, from, create.Undefined());
              // set the name to <library> object.
              library[1][from[1]] = to[1];
            } else {
              throw create.Error("error", "Illegal syntax of export in define-library");
            }
          } else {
            throw create.Error("error", "Illegal syntax of export in define-library");
          }
        }
      } else if (car[1] === "include-library-declarations") {
        assert.List(cdr, "Illegal syntax of include-library-declarations");
        const filenames = listToArray(cdr);
        assert.Strings(filenames, "Illegal filename of include-library-declarations");
        for (const filename of filenames) {
          if (!readFilenames.includes(filename[1])) { // Avoid to read multiple times.
            const readExpr = readFile.body({ filename }, itrp);
            assert.Pair(readExpr);
            assert.List(readExpr[2]);
            const includedDecls = listToArray(readExpr[2])
            assert.Pairs(includedDecls, `Illegal declarations in file ${filename[1]}`);
            fn(includedDecls);
          }
        }
      } else if (car[1] === "cond-expand") {
        assert.List(cdr, "Illegal syntax of cond-expand in define-library");
        const [clause1, ...clauses] = listToArray(cdr);
        const ret = condExpand.body({ clause1, clauses }, itrp, stack);
        if (!is.Undefined(ret)) {
          const [, ...subdecls] = listToArray(ret);
          assert.Pairs(subdecls, "Illegal result of cond-expand in define-library");
          fn(subdecls);
        }
      } else if (["import", "begin", "include", "include-cli"].includes(car[1])) {
        exprs.push(decl);
      } else {
        throw create.Error("error", "Illegal declaration in define-library");
      }
    }
  };
  fn(decls);

  // Note: This two call-stack executes
  //  1. libraryCS in library's environment.
  //     executes the content of the library.
  //     create.MultiValue([]) means not returning any value because baseCS doesn't expect any value.
  //  2. baseCS. in the current environment.
  //     defines the library name in the current environment.
  const baseCS = transferCS(stack, forms.Define(create.Symbol(nameStr), library));
  const libraryCS = forkCS(baseCS, forms.Begin(...exprs, create.MultiValue([])), { env: newEnv });
  return libraryCS;
});

export const procedures = {
  Import,
  define, defineValues, defineSyntax, defineSyntax1, defineRecordType,
  makeRecord, recordTypeQ, recordGet, recordSetD, defineLibrary
};
