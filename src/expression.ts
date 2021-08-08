// Special procedures/syntaxes in base-library introduced by R7RS
// Chapter "4. Expressions" are defined in this file.

// These procedures/sytaxes are defined in the library's file:
// delay -- lazy library
// delay-force --lazy library
// force -- lazy library
// promise? -- lazy library
// make-promise -- lazy library
// case-lambda -- case-lambda library

import { equalQ, eqvQ } from "./equivalence";
import type { Interpreter } from "./interpreter";
import { readFile } from "./misc";
import { features } from "./system";
import { LISP } from "./types";
import { writeObject } from "./unparser";
import { assertArray, assertNonNull, assert, is, contentCS, create, defineBuiltInProcedure, formalsToParameters, forms, arrayToList, listToArray, pairToArrayWithEnd, transferCS, uniqueId, contentStack, parentCS, forkCS, addStaticNS } from "./utils";

const quote = defineBuiltInProcedure("quote", [
  { name: "value", evaluate: false },
], ({ value }): LISP.Object => {
  assert.Object(value);
  return value;
});

const lambda = defineBuiltInProcedure("lambda", [
  { name: "formals", evaluate: false },
  { name: "body", type: "variadic", evaluate: false }
], ({ formals, body }, _itrp, stack): LISP.Procedure => {
  assert.Object(formals);
  assert.Objects(body);
  assertNonNull(stack);
  const [ups, vp] = formalsToParameters(formals);
  return create.Procedure(
    "lambda",
    vp ? [...ups, vp] : ups,
    forms.BeginIfMultiple(...body),
    false,
    contentCS(stack).env
  );
});

const If = defineBuiltInProcedure("if", [
  { name: "test" },
  { name: "consequent", evaluate: false },
  { name: "alternate", type: "optional", evaluate: false }
], ({test, consequent, alternate}) => {
  assert.Object(test);
  assert.Object(consequent);
  if (!is.False(test)) {
    return consequent;
  } else {
    if (alternate) {
      assert.Object(alternate);
      return alternate;
    } else {
      return ["<undefined>"];
    }
  }
}, true);

const setD = defineBuiltInProcedure("set!", [
  { name: "variable", evaluate: false },
  { name: "expr" }
], ({ variable, expr }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.Symbol(variable);
  assert.Object(expr);
  if (is.Undefined(expr)) {
    throw create.Error("undefined-variable", `Attempt to set undefined value to a variable "${variable[1]}"`);
  }
  const ret = itrp.setStatic(contentCS(stack).env.static, variable, expr);
  if (!ret) {
    throw create.Error("unbound-variable", `Attempt to set value to an unbound variable "${variable[1]}"`);
  }
  return ["<undefined>"];
});

// Note: include and include-cli always read files from the path relative to the current working directory.
const include = defineBuiltInProcedure("include", [
  { name: "str1" },
  { name: "strs", type: "variadic" }
], ({ str1, strs }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.String(str1);
  assert.Strings(strs);
  const filenames = [str1, ...strs];
  const exprs = filenames.map(filename => readFile.body({filename}, itrp));
  if (exprs.length === 1) {
    return exprs[0];
  } else {
    return forms.Begin(...exprs);
  }
}, true);

const includeCli = defineBuiltInProcedure("include-cli", [
  { name: "str1" },
  { name: "strs", type: "variadic" }
], ({ str1, strs }, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.String(str1);
  assert.Strings(strs);
  const filenames = [str1, ...strs];
  const exprs = filenames.map(filename => readFile.body({ filename, cli: create.Boolean(true) }, itrp));
  if (exprs.length === 1) {
    return exprs[0];
  } else {
    return forms.Begin(...exprs);
  }
}, true);

const cond = defineBuiltInProcedure("cond", [
  { name: "clause", evaluate: false },
  { name: "clauses", type: "variadic", evaluate: false },
], ({ clause, clauses }) => {
  assert.Pair(clause);
  assert.Pairs(clauses);
  const restCond: LISP.Object = clauses.length === 0
    ? ["<undefined>"]
    : forms.Cond(clauses[0], ...clauses.splice(1));
    const [first, second, ...rest] = listToArray(clause);
    if (is.Symbol(first) && first[1] === "else") {
    // Case of else.
    return forms.BeginIfMultiple(second, ...rest);
  } else if (!second) {
    // Test without second datum like ((= x 1))
    return forms.Or(first, restCond);
  } else {
    // Test with second datum like ((= x 1) ...)
    if (is.Symbol(second) && second[1] === "=>") {
      // Like ((= x 1) => (lambda (x) ....))
      if (rest.length !== 1) {
        throw create.Error("syntax-error", "Illegal cond syntax (test => expression).");
      }
      const symbol = create.Symbol(uniqueId());
      return forms.Let([[symbol, first]], forms.If(symbol, forms.Call(rest[0], symbol), restCond));
    } else {
      // Like ((= x 1) aaaa)
      return forms.If(first, forms.BeginIfMultiple(second, ...rest), restCond);
    }
  }
}, true);

// Note: We don't implement checking "if its value is not a procedure accepting one argument."
// (R7RS 4.2.1.) for performance reason. (reporting such error is recommended, but not required
// in R7RS).
const Case = defineBuiltInProcedure("case", [
  { name: "key"},
  { name: "clauses", type: "variadic", evaluate: false },
], ({ key, clauses }) => {
  assert.Object(key);
  assert.Pairs(clauses);
  const found = clauses.find((cl, idx) => {
    if (is.Symbol(cl[1]) && cl[1][1] === "else") {
      if (idx !== clauses.length -1) {
        throw create.Error("syntax-error", "Illegal case syntax (else placement).");
      }
      return true;
    } else {
      assert.Pair(cl[1]);
      // Note: compared by "eqv?".
      return listToArray(cl[1]).some(datum => eqvQ.body({ obj1: datum, obj2: key })[1]);
    }
  });
  if (found) {
    const [, second, ...rest] = listToArray(found);
    if (!second) {
      throw create.Error("syntax-error", "Illegal cond syntax (short clause).");
    } else if (is.Symbol(second) && second[1] === "=>") {
      if (rest.length !== 1) {
        throw create.Error("syntax-error", "Illegal cond syntax (test => expression).");
      }
      return forms.Call(rest[0], create.MultiValue([key]));
    } else {
      return forms.BeginIfMultiple(second, ...rest);
    }
  } else {
    return ["<undefined>"];
  }
}, true);

const and = defineBuiltInProcedure("and", [
  {name: "first", type: "optional"},
  {name: "rest", type: "variadic", evaluate: false},
], ({ first, rest }) => {
  if (!first) {
    return create.Boolean(true);
  }
  assert.Object(first);
  assert.Objects(rest);
  if (rest.length === 0 || is.False(first)) {
    return forms.Quote(first);
  } else {
    return forms.And(...rest);
  }
}, true);

const or = defineBuiltInProcedure("or", [
  {name: "first", type: "optional"},
  {name: "rest", type: "variadic", evaluate: false},
], ({ first, rest }) => {
  if (!first) {
    return create.Boolean(false);
  }
  assert.Object(first);
  assert.Objects(rest);
  if (rest.length === 0 || !is.False(first)) {
    return forms.Quote(first);
  } else {
    return forms.Or(...rest);
  }
}, true);

const when = defineBuiltInProcedure("when", [
  {name: "test"},
  {name: "expr", evaluate: false}, // required
  {name: "exprs", type: "variadic", evaluate: false}
], ({ test, expr, exprs}) => {
  assert.Object(test);
  assert.Object(expr);
  assert.Objects(exprs);
  if (!is.False(test)) {
    return forms.BeginIfMultiple(expr, ...exprs);
  } else {
    return ["<undefined>"];
  }
}, true);

const unless = defineBuiltInProcedure("unless", [
  {name: "test"},
  {name: "expr", evaluate: false}, // required
  {name: "exprs", type: "variadic", evaluate: false}
], ({ test, expr, exprs}) => {
  assert.Object(test);
  assert.Object(expr);
  assert.Objects(exprs);
  if (is.False(test)) {
    return forms.BeginIfMultiple(expr, ...exprs);
  } else {
    return ["<undefined>"];
  }
}, true);

export const condExpand = defineBuiltInProcedure("cond-expand", [
  {name: "clause1", evaluate: false}, // required
  {name: "clauses", type: "variadic", evaluate: false}
], ({ clause1, clauses }, itrp, stack) => {
  assert.Pair(clause1);
  assert.Pairs(clauses);
  assertNonNull(itrp);
  assertNonNull(stack);
  const clauseArray = [clause1, ...clauses];
  const featureArray = listToArray(features.body());
  const fn = (requirement: LISP.Object): boolean => {
    if (is.Symbol(requirement)) {
      return featureArray.some(ft => is.Symbol(ft) && ft[1] === requirement[1]);
    } else if (is.Pair(requirement)) {
      const [, car, cdr] = requirement;
      if (is.Symbol(car) && is.List(cdr)) {
        if (car[1] === "and") {
          return listToArray(cdr).every(item => fn(item))
        } else if (car[1] === "or") {
          return listToArray(cdr).some(item => fn(item))
        } else if (car[1] === "not") {
          if (is.Pair(cdr)) {
            return !fn(cdr[1]);
          }
        } else if (car[1] === "library") {
          if (is.Pair(cdr)) {
            const str = writeObject(cdr[1]);
            if (itrp.getBuiltInLibrary(str)) {
              return true;
            } else {
              const ret = itrp.getStatic(contentCS(stack).env.static, create.Symbol(str));
              return is.Library(ret);
            }
          }
        }
      }
    }
    return false;
  };
  const found = clauseArray.find(cl => fn(cl[1]));
  if (found) {
    return create.Pair(create.Procedure("built-in", "begin"), found[2]);
  } else {
    return create.Undefined();
  }
}, true);

// Note: "let" has 2 different syntax.
//  1. (let <bindings> <body>...
//  2. (let <name> <bindings> <body>...)
// Both can be realized with lambda expressions easily.
// Note: Calling lambda supports TCO.
// Note: "init"s are evaluated under environment of parent,
// the same way as lambda's arguments.
const Let = defineBuiltInProcedure("let", [
  { name: "args", type: "variadic", evaluate: false },
], ({ args }, _itrp, stack) => {
  assert.Objects(args);
  const [name, bindings, ...body] = is.Symbol(args[0]) ? args : [null, ...args];
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(stack);

  const binds = listToArray(bindings).map<[LISP.Symbol, LISP.Object]>(binding => {
    assert.Pair(binding);
    assert.Symbol(binding[1]);
    assert.Pair(binding[2]);
    const [, symbol, [, init]] = binding;
    return [symbol, init];
  });

  const symbols = binds.map(([symbol]) => symbol);
  const inits = binds.map(([, init]) => init);
  const lambda = forms.Lambda(symbols, null, ...body);

  if(!name) {
    return forms.Call(lambda, ...inits);
  } else {
    assert.Symbol(name);
    return forms.CallThunk(
      forms.Define(name, lambda),
      forms.Call(name, ...inits),
    );
  }
}, true);

// Note: "init"s are evaluated under sub-environment of left init's
// environment (See R7RS for detail).
// Note: let* piles environment for each variable. This affects
// performance to get the value of variables.
const LetStar = defineBuiltInProcedure("let*", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, _itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(stack);
  if (is.Pair(bindings)) {
    assert.Pair(bindings[1]);
    assert.Pair(bindings[1][2]);
    const [, [, symbol, [, init]], next] = bindings;
    assert.Symbol(symbol);
    return forms.Call(
      forms.Lambda([symbol], null,
        forms.CallBuiltIn("let*", next, ...body)
      ),
      init
    );
  } else {
    return forms.BeginIfMultiple(...body);
  }
}, true);

// All the variables are bound before inits are evaluated.
// inits are evaluated under body's environment.
const letrec = defineBuiltInProcedure("letrec", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(itrp);
  assertNonNull(stack);

  const binds = listToArray(bindings).map<[LISP.Symbol, LISP.Object]>(binding => {
    assert.Pair(binding);
    assert.Symbol(binding[1]);
    assert.Pair(binding[2]);
    const [, symbol, [, init]] = binding;
    return [symbol, init];
  });

  // Create new environment with all the specified variables bound.
  const { static: staticNS, dynamic: dynamicNS } = contentCS(stack).env;
  const newStaticNS = addStaticNS(staticNS);
  binds.forEach(([symbol]) => itrp.defineStatic(newStaticNS, symbol, ["<undefined>"]));

  // Create and execute a lambda procedure with the environment created above.
  // "init"s are evaluated and set to the variables in the procedure.
  // "body"s are evaluated after that.
  return forms.Call(
    create.Procedure("lambda", [],  forms.Begin(
      forms.DefineValues(
        binds.map(([symbol]) => symbol),
        forms.Values(...binds.map(([, init]) => init))
      ),
      ...body
    ), false, {static: newStaticNS, dynamic: dynamicNS})
  );
}, true);

// Almost same as letrec, but letrec* evaluates inits and set to variable in order,
// while letrec sets all the evaluated value of inits to variables at once.
const letrecStar = defineBuiltInProcedure("letrec*", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(itrp);
  assertNonNull(stack);

  const binds = listToArray(bindings).map<[LISP.Symbol, LISP.Object]>(binding => {
    assert.Pair(binding);
    assert.Symbol(binding[1]);
    assert.Pair(binding[2]);
    const [, symbol, [, init]] = binding;
    return [symbol, init];
  });

  // Create new environment with all the specified variables bound.
  const { static: staticNS, dynamic: dynamicNS } = contentCS(stack).env;
  const newStaticNS = addStaticNS(staticNS);
  binds.forEach(([symbol]) => itrp.defineStatic(newStaticNS, symbol, ["<undefined>"]));

  // Create and execute a lambda procedure with the environment created above.
  // "init"s are evaluated and set to the variables in order in the procedure.
  // "body"s are evaluated after that.
  return forms.Call(
    create.Procedure("lambda", [],  forms.Begin(
      ...binds.map(([symbol, init]) => forms.Set(symbol, init)),
      ...body
    ), false, {static: newStaticNS, dynamic: dynamicNS})
  );
}, true);

const letValues = defineBuiltInProcedure("let-values", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, _itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(stack);

  return forms.CallThunk(
    ...listToArray(bindings).map(binding => {
      assert.Pair(binding);
      assert.Pair(binding[2]);
      const [, formals, [, init]] = binding;
      // create thunk procedure with current environment.
      const thunk = create.Procedure("lambda", [], init, false, contentCS(stack).env);
      return forms.CallBuiltIn("define-values", formals, forms.Call(thunk))
    }),
    ...body
  );
}, true);


const letStarValues = defineBuiltInProcedure("let*-values", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, _itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(stack);
  if (is.Pair(bindings)) {
    assert.Pair(bindings[1]);
    assert.Pair(bindings[1][2]);
    const [, [, formals, [, init]], next] = bindings;
    return forms.CallThunk(
      forms.CallBuiltIn("define-values", formals, init),
      forms.CallBuiltIn("let*-values", next, ...body)
    );
  } else {
    return forms.BeginIfMultiple(...body);
  }
}, true);

// "begin" is used for the root of AST.
// Note: R7RS admits calling "begin" without arguments, but this implementation
// requires 1 or more arguments (at this moment).
// At the root of AST (depth = 0), tail of begin is not "tail context" to keep the depth
// of arguments more than one. This means every call-stack other than root's begin has
// upper call-stack.
const begin = defineBuiltInProcedure("begin", [
  { name: "exprs", type: "variadic", evaluate: true },
  { name: "last", type: "tail", evaluate: false },
], ({ exprs, last }, _itrp, stack) => {
  assertArray(exprs);
  assert.Object(last);
  assertNonNull(stack);
  if (contentCS(stack).depth === 0) {
    // Avoid to become depth = 0 when evaluating the last expression.
    return forkCS(stack, last);
  } else {
    return last;
  }
}, true);

// Note:
const Do = defineBuiltInProcedure("do", [
  {name: "specs", evaluate: false},
  {name: "clause", evaluate: false},
  {name: "commands", type: "variadic", evaluate: false},
], ({specs, clause, commands}) => {
  assert.List(specs);
  assert.List(clause);
  assert.Objects(commands);
  const specArray = listToArray(specs).map(spec => {
    assert.Pair(spec);
    assert.Pair(spec[2]);
    assert.Symbol(spec[1]);
    const [, symbol, [, init, rest]] = spec;
    const step = is.Pair(rest) ? rest[1] : null; // Step is optional.
    return [symbol, init, step] as const;
  });
  const [, test, exprs] = clause;
  assert.Object(test);
  assert.List(exprs);
  return forms.Let(
    specArray.map(([symbol, init]) => [symbol, init]),
    forms.If(
      test,
      is.Null(exprs) ? create.Undefined() : forms.Begin(...listToArray(exprs)),
      forms.Begin(
        ...commands,
        forms.CallBuiltIn("do",
          create.List(...specArray.map(([variable, , step]) => create.List(
            variable,
            step ?? variable,
            step ?? variable))
          ),
          clause,
          ...commands,
        ),
      ),
    ),
  );
}, true);

const makeParameter = defineBuiltInProcedure("make-parameter", [
  {name: "init"},
  {name: "converter", type: "optional"}
], ({init, converter}, itrp, stack) => {
  assert.Object(init);
  assertNonNull(itrp);
  assertNonNull(stack);
  let name = uniqueId();
  while(name in contentCS(stack).env.dynamic[1]) {
    name = uniqueId();
  }
  if (converter) {
    assert.Procedure(converter);
  }
  itrp.defineDynamic(contentCS(stack).env.dynamic, name, init);
  return create.Parameter(name, converter ?? null);
});

const parameterize = defineBuiltInProcedure("parameterize", [
  {name: "assocs", evaluate: false},
  {name: "body", type: "variadic", evaluate: false},
], ({assocs, body}, itrp, stack) => {
  assert.Pair(assocs);
  assert.Pairs(body);
  assertNonNull(itrp);
  assertNonNull(stack);
  const { env } = contentCS(stack);
  const arr = listToArray(assocs).map(item => {
    assert.Pair(item);
    assert.Pair(item[2]);
    const [, p, [, v ]] = item;
    return [p, v] as const;
  });
  // Create new dynamic environment.
  const newEnv = {static: env.static, dynamic: create.DynamicNS({}, env.dynamic)};
  const expr: LISP.Object = forms.BeginIfMultiple(
    ...arr.map(([p, v]) => (
      forms.CallBuiltIn("define-parameter", p, v)
    )),
    ...body
  );
  return transferCS(stack, expr, { env: newEnv });
});

// Hidden procedure
// A sub-procedure of parameterize.
const defineParameter = defineBuiltInProcedure("define-parameter", [
  { name: "param"},
  { name: "value", evaluate: false},
], ({ param, value }, itrp, stack): LISP.Object => {
  assert.Parameter(param);
  assert.Object(value);
  assertNonNull(itrp);
  assertNonNull(stack);
  const [,, converter ]= param;
  return forms.CallBuiltIn("define-parameter-1", param,
    converter ? forms.Call(converter, value) : value
  );
}, true, true);

// Hidden procedure
// A sub-procedure of define-parameter.
const defineParameter1 = defineBuiltInProcedure("define-parameter-1", [
  { name: "param"},
  { name: "value"},
], ({ param, value }, itrp, stack): LISP.Undefined => {
  assert.Parameter(param);
  assert.Object(value);
  assertNonNull(itrp);
  assertNonNull(stack);
  if (!is.Undefined(contentStack(contentCS(stack).env.dynamic)[param[1]] ?? ["<undefined>"])) {
    throw create.Error("redefine-variable", null);
  }
  itrp.defineDynamic(contentCS(stack).env.dynamic, param[1], value);
  return ["<undefined>"];
}, false, true);

const guard = defineBuiltInProcedure("guard", [
  { name: "arg1", evaluate: false }, // (variable clause1 clause2...)
  { name: "body", type: "variadic", evaluate: false },
], ({arg1, body}, _itrp, stack) => {
  assert.Pair(arg1);
  assert.Objects(body);
  assert.Symbol(arg1[1]);
  assert.Pair(arg1[2]);
  assertNonNull(stack);
  const [, variable, clauses] = arg1;

  const cont = create.Continuation(parentCS(stack)!);
  const handler = create.Procedure("lambda", [{ name: variable[1] }], (
    forms.Call(cont, forms.CallBuiltIn("cond",
      ...listToArray(clauses),
      create.List(create.Symbol("else"), forms.RaiseContinuable(variable))
    ))
  ), false, contentCS(stack).env);
  return forms.CallBuiltIn("with-exception-handler",
    handler,
    forms.Lambda([], null, ...body)
  )
}, true);

const quasiquote = defineBuiltInProcedure("quasiquote", [
  { name: "template", evaluate: false },
], ({template}) => {
  assert.Object(template);
  const marks: LISP.Symbol[] = [];
  const exprs: LISP.Object[] = [];
  const fn = (tree: LISP.Object, level: number): LISP.Object => {
    if (is.Pair(tree)) {
      const [, car, cdr] = tree;
      if (is.Symbol(car) && car[1] === "quasiquote") {
        return create.Pair(car, fn(cdr, level + 1));
      } else if (is.Symbol(car) && car[1] === "unquote" || car[1] === "unquote-splicing") {
        if (level !== 0) {
          return create.Pair(car, fn(cdr, level - 1));
        } else {
          const mark = create.Symbol( car[1] === "unquote-splicing" ? "@" + uniqueId() : uniqueId());
          assert.Pair(cdr);
          marks.push(mark);
          exprs.push(cdr[1]);
          return mark;
        }
      } else {
        return create.Pair(fn(car, level), fn(cdr, level));
      }
    } else if (is.Vector(tree)) {
      return create.Vector(tree[1].map(item => fn(item, level)), false);
    } else {
      return tree;
    }
  }
  const marked = fn(template, 0);
  return forms.CallBuiltIn("quasiquote-1", marked, create.List(...marks), ...exprs);
}, true);

// Hidden procedure.
const quasiquote1 = defineBuiltInProcedure("quasiquote-1", [
  { name: "template", evaluate: false },
  { name: "marks", evaluate: false },
  { name: "exprs", type: "variadic" },
], ({ template, marks, exprs }) => {
  assert.Object(template);
  assert.List(marks);
  assert.Objects(exprs);
  const markArray = listToArray(marks);
  assert.Symbols(markArray);
  const map = new Map<string, LISP.Object>();
  if (markArray.length !== exprs.length) {
    throw create.Error("arity-error", "quasiquote-1: marks and exprs unmatch.")
  }
  markArray.forEach((mark, i) => map.set(mark[1], exprs[i]));
  const fn = (tree: LISP.Object): LISP.Object => {
    if (is.Pair(tree)) {
      const [, car, cdr] = tree;
      if (is.Symbol(car) && car[1][0] === "@" && map.has(car[1])) {
        // unquote-splicing in a list
        const value = map.get(car[1])!;
        if (is.List(value)) {
          return is.Null(value)
            ? fn(cdr)
            : arrayToList(listToArray(value), fn(cdr));
        } else {
          throw create.Error("error", "unquote-splicing evaluated as non-list object.");
        }
      } else {
        // normal pair
        return create.Pair(fn(car), fn(cdr));
      }
    } else if (is.Vector(tree)) {
      return create.Vector(tree[1].map(item => {
        if (is.Symbol(item) && item[1][0] === "@" && map.has(item[1])) {
          // unquote-splicing in a vector
          const value = map.get(item[1])!;
          if (is.List(value)) {
            return is.Null(value)
              ? []
              : listToArray(value);
          } else {
            throw create.Error("error", "unquote-splicing evaluated as non-list object.");
          }
        } else {
          return [fn(item)]
        }
      }).flat(), false);
    } else if (is.Symbol(tree) && map.has(tree[1]) && tree[1][0] !== "@") {
      // unquote
      return map.get(tree[1])!;
    } else {
      // not a pair, vector, or unquote
      return tree;
    }
  }
  return fn(template);
}, false, true);

const letSyntax = defineBuiltInProcedure("let-syntax", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, _itrp, stack) => {
  assert.List(bindings, "aa");
  assert.Objects(body);
  assertNonNull(stack);

  const binds = listToArray(bindings).map<[LISP.Symbol, LISP.Procedure]>(binding => {
    assert.Pair(binding);
    assert.Pair(binding[2]);
    assert.Symbol(binding[1])
    const [, keyword, [, spec]] = binding;
    // create thunk procedure with current environment.
    const thunk = create.Procedure("lambda", [], spec, false, contentCS(stack).env);
    return [keyword, thunk];
  });

  return forms.CallThunk(
    ...binds.map(([keyword, thunk]) => (
      forms.CallBuiltIn("define-syntax", keyword, forms.Call(thunk))
    )),
    ...body
  );
}, true);

// Note: define variable names before calling define-syntax so that
// the name in the syntax-rules is not renamed.
const letrecSyntax = defineBuiltInProcedure("letrec-syntax", [
  { name: "bindings", evaluate: false},
  { name: "body", type: "variadic", evaluate: false },
], ({ bindings, body }, itrp, stack) => {
  assert.List(bindings);
  assert.Objects(body);
  assertNonNull(itrp);
  assertNonNull(stack);

  const binds = listToArray(bindings).map<[LISP.Symbol, LISP.Object]>(binding => {
    assert.Pair(binding);
    assert.Pair(binding[2]);
    assert.Symbol(binding[1])
    const [, keyword, [, spec]] = binding;
    return [keyword, spec];
  });

  // Create new environment with all the specified variables bound.
  const { static: staticNS, dynamic: dynamicNS } = contentCS(stack).env;
  const newStaticNS = addStaticNS(staticNS);
  binds.forEach(([symbol]) => itrp.defineStatic(newStaticNS, symbol, ["<undefined>"]));

  // Create and execute a lambda procedure with the environment created above.
  // "init"s are evaluated and set to the variables in the procedure.
  // "body"s are evaluated after that.
  return forms.Call(
    create.Procedure("lambda", [],  forms.Begin(
      ...binds.map(([keyword, spec]) => forms.CallBuiltIn("define-syntax", keyword, spec)),
      ...body
    ), false, {static: newStaticNS, dynamic: dynamicNS})
  );
}, true);

// Sub function for syntax-rules.
// Note: Currently only list patterns are suported. vectors are not supported.
const patternListToSyntaxRulePattern = (list: LISP.Pair, ellipsis: string, isRoot = true): LISP.ISyntaxRulePattern => {
  const [arr, end] = pairToArrayWithEnd(list);
  const ellipsisIdx = arr.findIndex(item => is.Symbol(item) && item[1] === ellipsis);
  const head = isRoot
    ? ellipsisIdx < 0 ? arr.slice(1) : arr.slice(1, ellipsisIdx - 1) // Note: ignore first position.
    : ellipsisIdx < 0 ? arr : arr.slice(0, ellipsisIdx - 1)
  const tail = ellipsisIdx < 0 ? [] : arr.slice(ellipsisIdx + 1);
  const variadic = ellipsisIdx < 0 ? null : arr[ellipsisIdx -1] ?? null;
  return ["<syntax-rule-pattern>",
    head.map(p => is.Pair(p) ? patternListToSyntaxRulePattern(p, ellipsis, false) : p),
    !variadic ? null : is.Pair(variadic) ?  patternListToSyntaxRulePattern(variadic, ellipsis, false) : variadic,
    tail.map(p => is.Pair(p) ? patternListToSyntaxRulePattern(p, ellipsis, false) : p),
    is.Null(end) ? null : end
  ];
}

const syntaxRules = defineBuiltInProcedure("syntax-rules", [
  { name: "arg1", evaluate: false },
  { name: "arg2", evaluate: false },
  { name: "args", type: "variadic", evaluate: false }
], ({ arg1, arg2, args }, itrp, stack): LISP.SyntaxRules => {
  assert.Object(arg1);
  assert.Object(arg2);
  assert.Objects(args);
  assertNonNull(itrp);
  assertNonNull(stack);

  const [ellipsis, literals, rules] = is.Symbol(arg1)
    ? [arg1[1], arg2, args]
    : ["...", arg1, [arg2, ...args]];

  // Get literals as an array of string.
  assert.List(literals);
  const literalArray = listToArray(literals).map(s => {
    assert.Symbol(s);
    return s[1];
  });

  // Convert a LISP tree to be "hyienic".
  // 1. Add call-stack information to all the bound symbols.
  // 2. Set keys for all unbound symbols except literals, ellipsis, and "_".
  const fn = (node: LISP.Object, renameMap = new Map<string, LISP.Symbol>()): LISP.Object => {
    if (is.Pair(node)) {
      return create.Pair(fn(node[1], renameMap), fn(node[2], renameMap));
    } else if (is.Symbol(node)) {
      if (itrp.getStatic(contentCS(stack).env.static, node)) {
        return create.Symbol(node[1], contentCS(stack).env.static, node[3] ?? null);
      } else {
        if (literalArray.includes(node[1]) || ellipsis === node[1] || "_" === node[1]) {
          return node;
        } else if (renameMap.has(node[1])) {
          return renameMap.get(node[1])!;
        } else {
          const s = create.Symbol(node[1], null, uniqueId());
          renameMap.set(node[1], s);
          return s;
        }
      }
    } else {
      return node;
    }
  }

  assert.Pairs(rules);
  const ruleObjs: [LISP.ISyntaxRulePattern, LISP.Object][] = [];
  for (const rule of rules) {
    const cloned = fn(rule); // Add call-stack information to symbols
    assert.Pair(cloned);
    assert.Pair(cloned[2]);
    const [, pattern, [, template]] = cloned;
    assert.Pair(pattern);
    // Note: Procedure calls can't handle improper list's last cdr.
    // That means we can't handle patterns with root like:
    //  (<pattern>... <pattern> <ellipsis> <pattern> ... . <pattern>)
    // See Interpreter's execute method.
    const [ps, end] = pairToArrayWithEnd(pattern);
    if (!is.Null(end) && ps.some(p => is.Symbol(p) && p[1] === ellipsis)) {
      throw create.Error("syntax-error", "The root of a syntax-rules pattern with ellipsis must be a proper list.");
    } else {
      ruleObjs.push([patternListToSyntaxRulePattern(pattern, ellipsis), template]);
    }
  }
  return create.SyntaxRules(ellipsis, literalArray, ruleObjs);
});


// Sub function for matchPattern (Step sub function for use-syntax-rules)
// Find all ther pattern variables in a pattern.
const getPatternVariables = (pattern: LISP.ISyntaxRulePattern | LISP.Object, literals: string[]): string[] => {
  if (is.SyntaxRulePattern(pattern)) {
    const [, head, variadic, tail, end] = pattern;
    const children = [
      ...head,
      ...(variadic ? [variadic] : [] ),
      ...tail,
      ...(end ? [end] : [] )
    ];
    return children.map(child => getPatternVariables(child, literals)).flat();
  } else if (is.Symbol(pattern) && !literals.includes(pattern[1])) {
    return pattern[1] === "_" ? [] : [pattern[1]];
  } else {
    return [];
  }
}

// Sub function for use-syntax-rules.
// Defines matching rule between pattern and input element for single object.
// See R7RS 4.3.2. Very limited support for now.
// When matched, returns a mapping from pattern variables to objects (excluding "_" if the keywords doesn't have it).
// when unmatched, returns null.
const matchPattern = (
  pattern: LISP.ISyntaxRulePattern | LISP.Object,
  expr: LISP.Object,
  itrp: Interpreter,
  callerNS: LISP.StaticNS,
  calleeNS: LISP.StaticNS,
  literals: string[],
): Map<string, LISP.Object | LISP.Object[]> | null => {
  if (is.SyntaxRulePattern(pattern)) {
    // Case of root of the pattern or a nested pattern
    if (!is.List(expr)) {
      return null;
    }
    // Check if expr is null
    const [, head, variadic, tail, end] = pattern;
    if (is.Null(expr)) {
      return (head.length === 0 && !variadic && tail.length === 0 && !end)
        ? new Map()
        : null;
    }
    // Check length of arguments
    const [argsArray, argsEnd] = pairToArrayWithEnd(expr);
    if (!!variadic || !!end) {
      if (argsArray.length < head.length + tail.length) {
        return null;
      }
    } else {
      if (argsArray.length !== head.length + tail.length) {
        return null;
      }
    }
    // Make a parameter list that matches the length of arguments.
    let params: (LISP.ISyntaxRulePattern | LISP.Object)[];
    if (variadic) {
      const variadicLength = argsArray.length - head.length - tail.length;
      params = [...head, ...(Array(variadicLength).fill(variadic) as LISP.Object[]), ...tail];
      if (end) {
        params.push(end);
        argsArray.push(argsEnd);
      }
    } else {
      // Note: there are no "tail" if no variadic.
      params = [...head];
      if (end) {
        params.push(end);
        argsArray.push(arrayToList(argsArray.slice(head.length), argsEnd));
      }
    }

    // Prepare arrays for variadic pattern-variables.
    const result = new Map<string, LISP.Object | LISP.Object[]>();
    if (variadic) {
      getPatternVariables(variadic, literals).forEach(v => result.set(v, []));
    }

    // Try to match every arguments.
    // If matched, the mappings are merged to results.
    for (let i = 0; i < params.length; i++) {
      const [p, a] = [params[i], argsArray[i]];
      const ret = matchPattern(p, a, itrp, callerNS, calleeNS, literals);
      if (!ret) {
        return null;
      }
      if (p === variadic) {
        for (const [k, v] of ret.entries()) {
          const arr = result.get(k);
          if (!arr || is.Object(arr)) {
            throw create.Error("syntax-error", `Internal error: illegal behavior of syntax-rules. No array prepared for variadic variable "${k}".`);
          }
          if (is.Object(v)) {
            result.set(k, [...arr, v])
          } else {
            result.set(k, [...arr, ...v])
          }
        }
      } else {
        for (const [k, v] of ret.entries()) {
          if (result.has(k)) {
            throw create.Error("syntax-error", "The same pattern variable appeared more than once in a pattern.");
          } else {
            result.set(k, v);
          }
        }
      }
    }
    return result;
  } else if (is.Symbol(pattern) && literals.includes(pattern[1])) {
    // Case if literal identifiers.
    // R7RS 4.3.2 says: Identifiers that appear in (literal ...) are interpreted as
    // literal identifiers to be matched against corresponding elements of the input.
    // An element in the input matches a literal identifier if and only if it is an
    // identifier and either both its occurrence in the macro expression and its occurrence
    // in the macro definition have the same lexical binding, or the two identifiers are
    // the same and both have no lexical binding.
    if (!is.Symbol(expr)) {
      return null;
    }
    const obj1 = itrp.getStatic(calleeNS, pattern);
    const obj2 = itrp.getStatic(callerNS, pattern);
    if (pattern[1] === expr[1] && obj1 === obj2) {
      return new Map();
    } else {
      return null;
    }
  } else if (is.Symbol(pattern)) { // Note: this includes the case of "_".
    // Case of pattern variable or "_"
    if (pattern[1] === "_") {
      return new Map();
    } else {
      return new Map([[pattern[1], expr]])
    }
  } else if (equalQ.body({obj1: pattern, obj2: expr})[1]) {
    // Case of pattern of literal datum.
    return new Map();
  } else {
    // Maybe no case.
    return null;
  }
}

// Like apply,this procedure take a "syntax-rules" object and a list of arguments.
// Trys to match the arguments with patterns that the rules have.
// Returns a matched rule's expression after replacing pattern variables.
const useSyntaxRules = defineBuiltInProcedure("use-syntax-rules", [
  { name: "spec" },
  { name: "args" }, // List
], ({ spec, args }, itrp, stack): LISP.Object => {
  assert.SyntaxRules(spec);
  assert.List(args);
  assertNonNull(itrp);
  assertNonNull(stack);

  const [, ellipsis, literals, rules] = spec;

  // Get static namespace of the caller of macro.
  // Note: assume that the current call-stack is procedure created by define-syntax.
  // the parent call-stack is the caller.
  const callerNS = contentCS(parentCS(stack)!).env.static;
  const calleeNS = contentCS(stack).env.static;

  // Find matching rule against arguments.
  let mappings: NonNullable<ReturnType<typeof matchPattern>>;
  let template: LISP.Object;
  {
    let ret, tmpl;
    for (const rule of rules) {
      if ((ret = matchPattern(rule[0], args, itrp, callerNS, calleeNS, literals))) {
        tmpl = rule[1];
        break;
      }
    }
    if (!ret || !tmpl) {
      throw create.Error("syntax-error", "No rules match arguments.");
    }
    [mappings, template] = [ret, tmpl];
  }

  // build object from template replacing pattern-variable according to the mappings.
  // Note: replacement of the items in vectors / bytevectors is not supported.
  const fn = (tmpl: LISP.Object): LISP.Object => {
    if (is.Pair(tmpl)) {
      const [, car, cdr] = tmpl;
      if (is.Symbol(car) && mappings.has(car[1]) && is.Symbol(cdr[1]) && cdr[1][1] === ellipsis) {
        // (xxxx symbol ... yyy) => (xxxx v1 v2 v3 yyyyy)
        const v = mappings.get(car[1]);
        if (!v || is.Object(v)) {
          throw create.Error("syntax-error", `Pattern variable "${car[1]} is not variadic." `);
        }
        return arrayToList(v, fn(cdr[2]));
      } else {
        if (is.Pair(car) && is.Symbol(car[1]) && car[1][1] === ellipsis && is.Pair(car[2])) {
          // (xxxx (<ellipsis> <template>) yyyy) => (xxxx template yyyy)
          return create.Pair(fn(car[2][1]), fn(cdr));
        } else {
          return create.Pair(fn(car), fn(cdr));
        }
      }
    } else if (is.Symbol(tmpl) && mappings.has(tmpl[1])) {
      // Replacement of pattern variables, except variadic.
      const v = mappings.get(tmpl[1])!;
      if (!is.Object(v)) {
        throw create.Error("syntax-error", `Pattern variable "${tmpl[1]}" must be variadic. (add "${ellipsis}" after the symbol)" `);
      }
      return v;
    } else {
      return tmpl;
    }
  }
  return fn(template);
}, false, true);

const syntaxError = defineBuiltInProcedure("syntax-error", [
  {name: "message" },
  {name: "args", type: "variadic"}
], ({message, args}) => {
  assert.String(message);
  assert.Objects(args);
  throw create.Error("syntax-error", message[1], args);
});

export const procedures = {
  quote, lambda, If, setD, include, includeCli, cond, Case, and, or, when, unless, condExpand, Let, LetStar, letrecStar,
  letrec, letValues, letStarValues, begin, Do, makeParameter, parameterize, defineParameter, defineParameter1,
  guard, quasiquote, quasiquote1, letSyntax, letrecSyntax, syntaxRules, applySyntaxRules: useSyntaxRules, syntaxError,
};
