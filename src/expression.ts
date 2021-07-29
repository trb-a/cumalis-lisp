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
import { LISP } from "./types";
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
// IMPOROVEME
// Library feature is not supported yet
// include
// include-cli
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

// library features are not supported yet.
// cond-expand

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
      forms.Begin(...listToArray(exprs)),
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
    // Note: Currently only list patterns are suported. vectors are not supported.
    assert.Pair(pattern);
    const [arr /*, endSymbol */] = pairToArrayWithEnd(pattern);
    // Note: Currently only flat patterns are supported.
    const ellipsisIdx = arr.findIndex(item => is.Symbol(item) && item[1] === ellipsis);
    const head = ellipsisIdx < 0 ? arr.slice(1) : arr.slice(1, ellipsisIdx - 1); // Note: ignore first position.
    const tail = ellipsisIdx < 0 ? [] : arr.slice(ellipsisIdx + 1);
    const variadic = ellipsisIdx < 0 ? null : arr[ellipsisIdx -1] ?? null;
    // const end = is.Symbol(endSymbol) ? endSymbol[1] : null;
    const patternObj: LISP.ISyntaxRulePattern = ["<syntax-rule-pattern>", head, variadic, tail/*, end*/];

    ruleObjs.push([patternObj, template]);
  }

  return create.SyntaxRules(ellipsis, literalArray, ruleObjs);
});

// Note: Minimum suport for now.
// Like apply, this procedure take a "syntax-rules" object and arguments,
// then trys to match the arguments with patterns that the rules have.
// Returns matched expression after replacing pattern-variables.
const useSyntaxRules = defineBuiltInProcedure("use-syntax-rules", [
  { name: "spec" },
  { name: "args", type: "variadic" }, // Like apply's arguments.
], ({ spec, args }, itrp, stack): LISP.Object => {
  assert.SyntaxRules(spec);
  assert.Objects(args);
  assertNonNull(itrp);
  assertNonNull(stack);

   const [, ellipsis, literals, rules] = spec;
  let argsArray: LISP.Object[];
  if (args.length === 0) {
    argsArray = [];
  } else {
    const [rest, last] = [args.slice(0, args.length -1), args[args.length -1]];
    assert.List(last);
    argsArray = [...rest, ...listToArray(last)];
  }

  // find matching pattern and make mappings from pattern-variable to object.
  const map = new Map<string, LISP.Object | LISP.Object[]>();
  let template: LISP.Object | null = null;

  // Get static namespace of the caller of macro.
  // Note: assume that the current call-stack is procedure created by define-syntax.
  // the parent call-stack is the caller.
  const callerStaticNS = contentCS(parentCS(stack)!).env.static;

  // This function is matching rule between pattern and input element for single object.
  // See R7RS 4.3.2. Very limited support for now.
  const matches = (p: LISP.Object, e: LISP.Object): boolean => {
    if (is.Symbol(p) && literals.includes(p[1])) {
      if (is.Symbol(e)) {
        // Literal identifiers
        // R7RS 4.3.2 says: Identifiers that appear in (hliterali . . . ) are interpreted as
        // literal identifiers to be matched against corresponding elements of the input.
        // An element in the input matches a literal identifier if and only if it is an
        // identifier and either both its occurrence in the macro expression and its occurrence
        // in the macro definition have the same lexical binding, or the two identifiers are
        // the same and both have no lexical binding.
        const obj1 = itrp.getStatic(callerStaticNS, p);
        const obj2 = itrp.getStatic(callerStaticNS, p);
        return p[1] === e[1] && obj1 === obj2;
      } else {
        return false;
      }
    } else if (is.Symbol(p)) { // Note: this includes the case of "_".
      return true;
    // } else if (isSyntaxRulePattern(p)) { // Note: limited support. Only flat patterns are supported,
    // }
    } else if (equalQ.body({obj1: p, obj2: e})[1]) { // Note: limited support. R7RS saids compare by "equals?"
      return true;
    } else {
      return false;
    }
  }
  // Find matching rule against arguments.
  for (const rule of rules) {
    const [[, head, variadic, tail /*, end */]] = rule;
    // Match number of parameters/arguments.
    if (variadic ? (argsArray.length >= head.length + tail.length) : (argsArray.length === head.length + tail.length)) {
      // Expand parameters to the length of exprs.
      const variadicLength = argsArray.length - head.length - tail.length;
      const params = [...head, ...(Array(variadicLength).fill(variadic) as LISP.Object[]), ...tail];
      // Match position of keywords.
      if (params.every((p, i) => matches(p, argsArray[i]))) {
        // Found!.
        // Prepare an array for variadic pattern variable
        if (is.Symbol(variadic)) {
          map.set(variadic[1], []);
        }
        // Set template and symbol mappings excluding "_".
        template = rule[1];
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          const e = argsArray[i];
          if (is.Symbol(p) && p[1] !== "_") {
            const v = map.get(p[1]);
            if (!!v && !is.Object(v)) {
              v.push(e); // Note: this must be a variadic parameter.
            } else {
              map.set(p[1], e);
            }
          }
        }
        break;
      }
    }
  }
  if (!template) {
    throw create.Error("syntax-rules-unmatch", "No rules match arguments.");
  }

  // build object from template replacing pattern-variable according to the mappings.
  // Note: replacement of the items in vectors / bytevectors is not supported.
  const fn = (tmpl: LISP.Object): LISP.Object => {
    if (is.Pair(tmpl)) {
      const [, car, cdr] = tmpl;
      if (is.Symbol(car) && map.has(car[1]) && is.Symbol(cdr[1]) && cdr[1][1] === ellipsis) {
        // (xxxx symbol ... yyy) => (xxxx v1 v2 v3 yyyyy)
        const v = map.get(car[1]);
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
    } else if (is.Symbol(tmpl) && map.has(tmpl[1])) {
      // Replacement of pattern variables, except variadic.
      const v = map.get(tmpl[1])!;
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
  quote, lambda, If, setD, cond, Case, and, or, when, unless, Let, LetStar, letrecStar,
  letrec, letValues, letStarValues, begin, Do, makeParameter, parameterize, defineParameter, defineParameter1,
  guard, quasiquote, quasiquote1, letSyntax, letrecSyntax, syntaxRules, applySyntaxRules: useSyntaxRules, syntaxError,
  // include, includeCli
};
