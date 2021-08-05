import { name as PACKAGE_NAME, version as PACKAGE_VERSION } from "../package.json";
import type { BuiltInProcedureBody, BuiltInProcedureDefinition, Envelope } from "./interpreter";
import { Dictionary, ExceptFirst, LISP, Stack, StackContent } from "./types";
import { writeObject } from "./unparser";

// -------------------------------------------------------
//                       Utilities
// -------------------------------------------------------

// Related to <number>
export const numberToJSNumber = (n: LISP.Number): number => (
  typeof n[1] === "number"
    ? n[1]
    : n[1] === "+inf.0"
      ? Infinity
      : n[1] === "-inf.0"
        ? -Infinity
        : NaN
);

export const JSNumberToNumber = (n: number): LISP.Number => (
  create.Number(
    !Number.isFinite(n)
      ? (n < 0 ? "-inf.0" : "+inf.0")
      : Number.isNaN(n)
        ? "+nan.0"
        : n
  )
);

// Related to lists (<pair> / <null>)

// Note: works as if (append list (cons item  '()))
export const pushList = (list: LISP.List, item: LISP.Object): LISP.Pair => (
  is.Null(list)
    ? create.Pair(item, ["<null>"])
    : !is.Pair(list[2])
      ? create.Pair(list[1], create.Pair(item, ["<null>"]))
      : create.Pair(list[1], pushList(list[2], item))
);

// Related to stacks
export const nextStack = <T extends Stack<any, any>>(stack: T): T | null => stack[2] as T;
export const contentStack = <T extends Stack<any, any>>(stack: T): StackContent<T> => stack[1];

// Related to call-stacks
export const parentCS = (cs: LISP.CallStack): LISP.CallStack | null => cs[2];
export const arrayCS = (start: LISP.CallStack): LISP.CallStack[] => {
  const results: LISP.CallStack[] = [];
  for (let current: LISP.CallStack | null = start; current; current = parentCS(current)) {
    results.push(current);
  }
  return results;
}
export const contentCS = (cs: LISP.CallStack): LISP.CallStack[1] => cs[1];
export const updateCS = (cs: LISP.CallStack, overwrite: Partial<LISP.CallStack[1]>): LISP.CallStack => {
  const content = contentCS(cs);
  Object.entries(overwrite).filter(([, v]) => v !== undefined).forEach(([k, v]) => (content as any)[k] = v);
  return cs;
}

// Interpreter.evalAST/exit-emergency use this.
export const createCS = (expr: LISP.Object): LISP.CallStack => {
  const env = { static: create.StaticNS({}, null), dynamic: create.DynamicNS({}, null) };
  return ["#CALL-STACK#", {
    depth: 0, env, expr,
    want: null, oper: null, args: null,
    before: null, after: null, handler: null,
    info: (is.Pair(expr) && expr[4]) || null,
  }, null];
}

export const cloneCS = (cs: LISP.CallStack): LISP.CallStack => {
  const content = contentCS(cs);
  const args = content.args;
  return ["#CALL-STACK#", { ...content, args: args ? [...args] : null }, parentCS(cs)];
}

// call-with-values, dynamic-wind, begin(root), evaluating operator and arguments,
// before-handler, evaluation of lambda-macro use this.
// Note: before, after is for dynamic-wind.
// Note: env is for lambda-macro.
export const forkCS = (
  parent: LISP.CallStack,
  expr: LISP.Object,
  overwrite: Partial<Pick<LISP.CallStack[1], "env" | "before" | "after">> = {}
): LISP.CallStack => {
  const { env, handler, depth, info } = contentCS(parent);
  return ["#CALL-STACK#", {
    depth: depth + 1,
    env: overwrite.env ?? env,
    expr,
    want: null, oper: null, args: null,
    before: overwrite.before ?? null,
    after: overwrite.after ?? null,
    handler: handler,
    info: (is.Pair(expr) && expr[4]) || info,
  }, parent];
}

// Note: "env" is for lambda procedure call / eval.
// Note: "handler" is for with-exception-handler and error handlers.
// Note: "oper"/"want" is for call-with-values
// Note: "before" / "after" is for "after" handler of dynamic-wind to avoid infinite loops.
//       "before" handler uses forkCS.
export const transferCS = (
  current: LISP.CallStack,
  expr: LISP.Object,
  overwrite: Partial<Pick<LISP.CallStack[1], "env" | "before" | "after" | "handler" | "oper" | "want">> = {}
): LISP.CallStack => {
  const { env, handler, depth, info, before, after } = contentCS(current);
  return ["#CALL-STACK#", {
    depth,
    env: overwrite.env ?? env,
    expr,
    want: overwrite.want ?? null,
    oper: overwrite.oper ?? null,
    args: null,
    before: overwrite.before === undefined ? before : overwrite.before,
    after: overwrite.after === undefined ? after : overwrite.after,
    handler: overwrite.handler !== undefined ? overwrite.handler : handler,
    info: (is.Pair(expr) && expr[4]) || info,
  }, parentCS(current)];
}

export const addStaticNS = (ns: LISP.StaticNS): LISP.StaticNS => [ns[0], {}, ns];
export const addDynamicNS = (ns: LISP.DynamicNS): LISP.DynamicNS => [ns[0], {}, ns];

// Create Scheme / special objects
export const create = {
  // Objects
  Symbol: (...args: ExceptFirst<LISP.ISymbol>): LISP.ISymbol => ["<symbol>", ...args],
  String: (...args: ExceptFirst<LISP.IString>): LISP.IString => ["<string>", ...args],
  Number: (...args: ExceptFirst<LISP.INumber>): LISP.INumber => ["<number>", ...args],
  Boolean: (...args: ExceptFirst<LISP.IBoolean>): LISP.IBoolean => ["<boolean>", ...args],
  Character: (...args: ExceptFirst<LISP.ICharacter>): LISP.ICharacter => ["<character>", ...args],
  Pair: (cons: LISP.Object, cdr: LISP.Object, immutable = false, info?: Dictionary<string | number> | null): LISP.IPair => (
    info ? ["<pair>", cons, cdr, immutable, info] : ["<pair>", cons, cdr, immutable]
  ),
  Null: (): LISP.INull => ["<null>"],
  Vector: (...args: ExceptFirst<LISP.IVector>): LISP.IVector => ["<vector>", ...args],
  ByteVector: (...args: ExceptFirst<LISP.IByteVector>): LISP.IByteVector => ["<bytevector>", ...args],
  EndOfFile: (...args: ExceptFirst<LISP.IEndOfFile>): LISP.IEndOfFile => ["<end-of-file>", ...args],
  Procedure: (...args: ExceptFirst<LISP.IProcedure>): LISP.IProcedure => ["<procedure>", ...args],
  Port: (...args: ExceptFirst<LISP.IPort>): LISP.IPort => ["<port>", ...args],
  RecordType: (...args: ExceptFirst<LISP.IRecordType>): LISP.IRecordType => ["<record-type>", ...args],
  Record: (...args: ExceptFirst<LISP.IRecord>): LISP.IRecord => ["<record>", ...args],
  SyntaxRules: (...args: ExceptFirst<LISP.ISyntaxRules>): LISP.ISyntaxRules => ["<syntax-rules>", ...args],
  Parameter: (...args: ExceptFirst<LISP.IParameter>): LISP.IParameter => ["<parameter>", ...args],
  MultiValue: (...args: ExceptFirst<LISP.IMultiValue>): LISP.IMultiValue => ["<multi-value>", ...args],
  Exception: (...args: ExceptFirst<LISP.IException>): LISP.IException => ["<exception>", ...args],
  Undefined: (...args: ExceptFirst<LISP.IUndefined>): LISP.IUndefined => ["<undefined>", ...args],
  Promise: (...args: ExceptFirst<LISP.IPromise>): LISP.IPromise => ["<promise>", ...args],
  Error: (name: string, message: string | null, irritants: LISP.Object[] = []): LISP.IError => ["<error>", name, message, irritants],
  Continuation: (...args: ExceptFirst<LISP.IContinuation>): LISP.IContinuation => ["<continuation>", ...args],
  EnvironmentSpec: (...args: ExceptFirst<LISP.IEnvironmentSpec>): LISP.IEnvironmentSpec => ["<environment-spec>", ...args],
  JS: (...args: ExceptFirst<LISP.IJS>): LISP.IJS => ["<js>", ...args],
  List: (...args: LISP.Object[]): LISP.List => (
    args.reverse().reduce<LISP.List>((prev, curr) => ["<pair>", curr, prev, false], ["<null>"])
  ),
  // Specials
  Suspend: (...args: ExceptFirst<LISP.Suspend>): LISP.Suspend => ["#SUSPEND#", ...args],
  JSPromiseContinuation: (...args: ExceptFirst<LISP.JSPromiseContinuation>): LISP.JSPromiseContinuation => ["#JS-PROMISE-CONTINUATION#", ...args],
  Exit: (...args: ExceptFirst<LISP.Exit>): LISP.Exit => ["#EXIT#", ...args],
  // Namespaces
  StaticNS: (...args: ExceptFirst<LISP.Env["static"]>): LISP.Env["static"] => ["#STATIC-NS-STACK#", ...args],
  DynamicNS: (...args: ExceptFirst<LISP.Env["dynamic"]>): LISP.Env["dynamic"] => ["#DYNAMIC-NS-STACK#", ...args],
  // Others
  HandlerStack: (...args: ExceptFirst<Stack<"#HANDLER-STACK#", LISP.Procedure>>): Stack<"#HANDLER-STACK#", LISP.Procedure> => ["#HANDLER-STACK#", ...args],
};

// Create procedure calls
// Create procedure calls
export const forms = {
  Call: (oper: LISP.Object, ...args: LISP.Object[]): LISP.List => create.List(oper, ...args),
  CallBuiltIn: (name: string, ...args: LISP.Object[]): LISP.List => create.List(create.Procedure("built-in", name), ...args),
  Lambda: (...args: [params: LISP.Symbol[], variadic: LISP.Symbol | null, ...body: LISP.Object[]] | [params: LISP.List, ...body: LISP.Object[]]): LISP.List => (
    is.List(args[0])
      ? forms.CallBuiltIn("lambda", ...(args as LISP.Object[]))
      : forms.CallBuiltIn("lambda", arrayToList(args[0], args[1]), ...(args as LISP.Object[]).slice(2))
  ),
  // Works like begin, but set stacks an environment,
  CallThunk: (...args: LISP.Object[]): LISP.List => forms.Call(forms.CallBuiltIn("lambda", ["<null>"], ...args)),
  Begin: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("begin", ...args),
  Quote: (arg: LISP.Object): LISP.List => forms.CallBuiltIn("quote", arg),
  Set: (arg1: LISP.Symbol, arg2: LISP.Object): LISP.List => forms.CallBuiltIn("set!", arg1, arg2),
  Raise: (arg: LISP.Object): LISP.List => forms.CallBuiltIn("raise", arg),
  RaiseContinuable: (arg: LISP.Object): LISP.List => forms.CallBuiltIn("raise-continuable", arg),
  Let: (bindings: [LISP.Symbol, LISP.Object][], ...body: LISP.Object[]): LISP.List => forms.CallBuiltIn("let",
    create.List(...bindings.map(binding => create.List(...binding))),
    ...body
  ),
  If: (arg1: LISP.Object, arg2: LISP.Object, arg3?: LISP.Object): LISP.List => (
    arg3
      ? forms.CallBuiltIn("if", arg1, arg2, arg3)
      : forms.CallBuiltIn("if", arg1, arg2)
  ),
  And: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("and", ...args),
  Or: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("or", ...args),
  Cond: (arg: LISP.Pair, ...args: LISP.Pair[]): LISP.List => forms.CallBuiltIn("cond", arg, ...args),
  Case: (key: LISP.Object, clauses: LISP.Object[][]): LISP.List => forms.CallBuiltIn("case", key, create.List(...clauses.map(cl => create.List(...cl)))),
  Define: (...args: [arg1: LISP.Symbol, arg2: LISP.Pair, arg3: LISP.Object] | [arg1: LISP.Symbol, arg2: LISP.Object]): LISP.List => forms.CallBuiltIn("define", ...args),
  DefineValues: (formals: LISP.List | LISP.Symbol[], values: LISP.Object): LISP.List => forms.CallBuiltIn("define-values", is.List(formals) ? formals : create.List(...formals), values),
  Append: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("append", ...args),
  Cons: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("cons", ...args),
  Values: (...args: LISP.Object[]): LISP.List => forms.CallBuiltIn("values", ...args),
  BeginIfMultiple: (...args: LISP.Object[]): LISP.Object => args.length === 0 ? ["<undefined>"] : args.length === 1 ? args[0] : forms.Begin(...args),
};

// Class object type-guards
export const is = {
  Symbol: (v: unknown): v is LISP.ISymbol => v instanceof Array && (v[0] === "<symbol>"),
  String: (v: unknown): v is LISP.IString => v instanceof Array && (v[0] === "<string>"),
  Number: (v: unknown): v is LISP.INumber => v instanceof Array && v[0] === "<number>",
  Boolean: (o: unknown): o is LISP.IBoolean => o instanceof Array && o[0] === "<boolean>",
  Character: (o: unknown): o is LISP.ICharacter => o instanceof Array && o[0] === "<character>",
  Pair: (v: unknown): v is LISP.IPair => v instanceof Array && (v[0] === "<pair>"),
  Null: (v: unknown): v is LISP.INull => v instanceof Array && (v[0] === "<null>"),
  Vector: (v: unknown): v is LISP.IVector => v instanceof Array && (v[0] === "<vector>"),
  ByteVector: (v: unknown): v is LISP.IByteVector => v instanceof Array && (v[0] === "<bytevector>"),
  EndOfFile: (v: unknown): v is LISP.IEndOfFile => v instanceof Array && (v[0] === "<end-of-file>"),
  Port: (o: unknown): o is LISP.IPort => (o instanceof Array && (o[0] === "<port>")),
  RecordType: (o: unknown): o is LISP.IRecordType => (o instanceof Array && (o[0] === "<record-type>")),
  Record: (o: unknown): o is LISP.IRecord => (o instanceof Array && (o[0] === "<record>")),
  MultiValue: (o: unknown): o is LISP.IMultiValue => (o instanceof Array && (o[0] === "<multi-value>")),
  SyntaxRules: (o: unknown): o is LISP.ISyntaxRules => (o instanceof Array && o[0] === "<syntax-rules>"),
  Parameter: (o: unknown): o is LISP.IParameter => (o instanceof Array && o[0] === "<parameter>"),
  EnvironmentSpec: (o: unknown): o is LISP.IEnvironmentSpec => (o instanceof Array && o[0] === "<environment-spec>"),
  Exception: (o: unknown): o is LISP.IException => (o instanceof Array && o[0] === "<exception>"),
  Undefined: (o: unknown): o is LISP.IUndefined => (o instanceof Array && o[0] === "<undefined>"),
  Promise: (o: unknown): o is LISP.IPromise => (o instanceof Array && o[0] === "<promise>"),
  Error: (o: unknown): o is LISP.IError => (o instanceof Array && o[0] === "<error>"),
  Continuation: (o: unknown): o is LISP.IContinuation => (o instanceof Array && (o[0] === "<continuation>")),
  JS: (o: unknown): o is LISP.IJS => o instanceof Array && o[0] === "<js>",
  // Abstracted
  List: (v: unknown): v is LISP.List => is.Pair(v) || is.Null(v),
  Procedure: (o: unknown): o is LISP.Procedure => (o instanceof Array && (o[0] === "<procedure>" || o[0] === "<continuation>" || o[0] === "<parameter>")),
  Object: (o: unknown): o is LISP.Object => o instanceof Array && typeof o[0] === "string" && /^<.*>/.test(o[0]),
  Evaluatable: (o: unknown): o is LISP.List | LISP.Symbol => is.List(o) || is.Symbol(o),
  // Utility
  False: (o: unknown): o is LISP.Boolean & { 1: false } => is.Boolean(o) && o[1] === false,
  RealNumber: (o: unknown): o is LISP.RealNumber => is.Number(o) && typeof o[1] === "number",
  IntegerNumber: (o: unknown): o is LISP.RealNumber => is.Number(o) && typeof o[1] === "number" && Number.isInteger(o[1]),
  Objects: (o: unknown): o is LISP.Object[] => o instanceof Array && o.every(item => is.Object(item)),
  // Specials
  Suspend: (o: unknown): o is LISP.Suspend => (o instanceof Array && o[0] === "#SUSPEND#"),
  JSPromiseContinuation: (o: unknown): o is LISP.JSPromiseContinuation => (o instanceof Array && o[0] === "#JS-PROMISE-CONTINUATION#"),
  Exit: (o: unknown): o is LISP.Exit => (o instanceof Array && o[0] === "#EXIT#"),
  CallStack: (o: unknown): o is LISP.CallStack => (o instanceof Array && o[0] === "#CALL-STACK#"),
  SpecialObject: (o: unknown): o is LISP.SpecialObject => (o instanceof Array && typeof o[0] === "string" && /^#.+#$/.test(o[0])),
  // Others
  Dictionary: (o: unknown): o is Dictionary<any> => typeof o === "object" && !!o && o.constructor === Object,
  Stack: (o: unknown): o is Stack<any, any> => (o instanceof Array && o.length === 3 && typeof o[0] === "string" && /^#.*-STACK#$/.test(o[0])),
};

// Class object assertion
const makeAsserter: <T>(guard: ((x: unknown) => x is T), defaultMessage: string) => (v: any, message?: string) => asserts v is T = (
  (guard, defaultMessage) => (v, message) => {
    if (!guard(v)) {
      throw create.Error("domain-error", message ?? defaultMessage);
    }
  }
);

const makeArrayAsserter: <T>(guard: ((x: unknown) => x is T), defaultMessage: string) => (vs: any, message?: string) => asserts vs is T[] = (
  (guard, defaultMessage) => (vs, message) => {
    if (!(vs instanceof Array)) {
      throw create.Error("domain-error", message ?? defaultMessage);
    }
    for (const v of vs) {
      if (!guard(v)) {
        throw create.Error("domain-error", message ?? defaultMessage);
      }
    }
  }
);

export const assert: {
  // Note: Assertion requires this explicit declaration. Otherwize get ts2775 errors.
  // Single object
  List: (v: any, message?: string | undefined) => asserts v is LISP.List;
  Pair: (v: any, message?: string | undefined) => asserts v is LISP.IPair;
  Symbol: (v: any, message?: string | undefined) => asserts v is LISP.ISymbol;
  Number: (v: any, message?: string | undefined) => asserts v is LISP.INumber;
  Boolean: (v: any, message?: string | undefined) => asserts v is LISP.IBoolean;
  Object: (v: any, message?: string | undefined) => asserts v is LISP.Object;
  String: (v: any, message?: string | undefined) => asserts v is LISP.IString;
  Vector: (v: any, message?: string | undefined) => asserts v is LISP.IVector;
  ByteVector: (v: any, message?: string | undefined) => asserts v is LISP.IByteVector;
  Character: (vs: any, message?: string | undefined) => asserts vs is LISP.ICharacter;
  Promise: (vs: any, message?: string | undefined) => asserts vs is LISP.IPromise;
  Error: (v: any, message?: string | undefined) => asserts v is LISP.IError;
  Procedure: (v: any, message?: string | undefined) => asserts v is LISP.Procedure;
  SyntaxRules: (v: any, message?: string | undefined) => asserts v is LISP.ISyntaxRules;
  Parameter: (v: any, message?: string | undefined) => asserts v is LISP.IParameter;
  EnvironmentSpec: (v: any, message?: string | undefined) => asserts v is LISP.IEnvironmentSpec;
  RecordType: (v: any, message?: string | undefined) => asserts v is LISP.IRecordType;
  Record: (v: any, message?: string | undefined) => asserts v is LISP.IRecord;
  MultiValue: (v: any, message?: string | undefined) => asserts v is LISP.IMultiValue;
  Port: (v: any, message?: string | undefined) => asserts v is LISP.IPort;
  // Array of object
  Lists: (vs: any, message?: string | undefined) => asserts vs is LISP.List[];
  Pairs: (vs: any, message?: string | undefined) => asserts vs is LISP.IPair[];
  Symbols: (vs: any, message?: string | undefined) => asserts vs is LISP.ISymbol[];
  Numbers: (vs: any, message?: string | undefined) => asserts vs is LISP.INumber[];
  Booleans: (vs: any, message?: string | undefined) => asserts vs is LISP.IBoolean[];
  Objects: (vs: any, message?: string | undefined) => asserts vs is LISP.Object[];
  Strings: (vs: any, message?: string | undefined) => asserts vs is LISP.IString[];
  Vectors: (vs: any, message?: string | undefined) => asserts vs is LISP.IVector[];
  ByteVectors: (vs: any, message?: string | undefined) => asserts vs is LISP.IByteVector[];
  Characters: (vs: any, message?: string | undefined) => asserts vs is LISP.ICharacter[];
  // Others
  RealNumber: (v: any, message?: string | undefined) => asserts v is LISP.RealNumber;
  IntegerNumber: (v: any, message?: string | undefined) => asserts v is LISP.RealNumber;
  RealNumbers: (vs: any, message?: string | undefined) => asserts vs is LISP.RealNumber[];
  IntegerNumbers: (vs: any, message?: string | undefined) => asserts vs is LISP.RealNumber[];
} = {
  // Single object
  List: makeAsserter(is.List, "A <pair> or <null> is expected."),
  Pair: makeAsserter(is.Pair, "A <pair> is expected."),
  Symbol: makeAsserter(is.Symbol, "A <symbol> is expected."),
  Number: makeAsserter(is.Number, "A <number> is expected."),
  Boolean: makeAsserter(is.Boolean, "A <boolean> is expected."),
  Object: makeAsserter(is.Object, "A Scheme object is expected."),
  String: makeAsserter(is.String, "A <string> is expected."),
  Vector: makeAsserter(is.Vector, "A <vector> is expected."),
  ByteVector: makeAsserter(is.ByteVector, "A <bytevector> is expected."),
  Character: makeAsserter(is.Character, "A <character> is expected."),
  Promise: makeAsserter(is.Promise, "A <promise> is expected."),
  Error: makeAsserter(is.Error, "A <error> is expected."),
  Procedure: makeAsserter(is.Procedure, "A <procedure> is expected."),
  SyntaxRules: makeAsserter(is.SyntaxRules, "A <syntax-rules> is expected."),
  Parameter: makeAsserter(is.Parameter, "A <parameter> is expected."),
  EnvironmentSpec: makeAsserter(is.EnvironmentSpec, "A <environment-spec> is expected."),
  RecordType: makeAsserter(is.RecordType, "A <record-type> is expected."),
  Record: makeAsserter(is.Record, "A <record> is expected."),
  MultiValue: makeAsserter(is.MultiValue, "A <multi-value> is expected."),
  Port: makeAsserter(is.Port, "A <port> is expected."),
  // Array of object
  Lists: makeArrayAsserter(is.List, "An array of <pair>/<null> is expected."),
  Pairs: makeArrayAsserter(is.Pair, "An array of <pair> is expected."),
  Symbols: makeArrayAsserter(is.Symbol, "An array of <symbol> is expected."),
  Numbers: makeArrayAsserter(is.Number, "An array of <number> is expected."),
  Booleans: makeArrayAsserter(is.Boolean, "An array of <boolean> is expected."),
  Objects: makeArrayAsserter(is.Object, "An array of Scheme object is expected."),
  Strings: makeArrayAsserter(is.String, "An array of <string> is expected."),
  Vectors: makeArrayAsserter(is.Vector, "An array of <vector> is expected."),
  ByteVectors: makeArrayAsserter(is.ByteVector, "An array of  <bytevector> is expected."),
  Characters: makeArrayAsserter(is.Character, "An array of <character> is expected."),
  // Others
  RealNumber: makeAsserter(is.RealNumber, "A real <number> (not infinite, not NaN) is expected."),
  IntegerNumber: makeAsserter(is.IntegerNumber, "A integer <number> is expected."),
  RealNumbers: makeArrayAsserter(is.RealNumber, "An array of real <number> is expected."),
  IntegerNumbers: makeArrayAsserter(is.IntegerNumber, "An array of integer <number> is expected."),
};

// Special assertions
export const assertNonNull: <T = unknown>(v: T,  message?: string) => asserts v is NonNullable<T> = (v, message) => {
  if (v === undefined || v === null) {
    throw create.Error("program-error", message ?? "Required object.");
  }
}

export const assertArray: (v: unknown,  message?: string) => asserts v is Array<any> = (v, message) => {
  if (!(v instanceof Array)) {
    throw create.Error("program-error", message ?? "An array is expected.");
  }
}

export const isDictionary = (o: unknown): o is Dictionary<any> => (
  (typeof o === "object" && o !== null && o.constructor.name === "Object")
);

// export const isOneOf = <T extends readonly any[]>(o: unknown, arr: T): o is T[number] => arr.includes(o);

// Envelope

export const isEnvelope = (
  o: (any),
): o is Envelope => (
  !!o && typeof o === "object" &&
  o.language === PACKAGE_NAME &&
  !!o.version && (is.Object(o.content) || is.SpecialObject(o.content))
);

export const isCurrentVersionEnvelope = (
  o: (any),
): o is Envelope => (
  !!o && typeof o === "object" &&
  o.language === PACKAGE_NAME &&
  o.version === PACKAGE_VERSION &&
  (is.Object(o.content) || is.SpecialObject(o.content))
);

export type SuspendEnvelope = Envelope & { content: LISP.Suspend };

export const isSuspendEnvelope = (
  o: (any)
): o is SuspendEnvelope => (
  isEnvelope(o) && is.Suspend(o.content)
);

export const suspendValueFromEnvelope = (
  envelope:  SuspendEnvelope
): LISP.Object => (
  envelope.content[2]
);

export type JSPromiseContinuationEnvelope = Envelope & { content: LISP.JSPromiseContinuation };

export const isJSPromiseContinuationEnvelope = (
  o: (any)
): o is JSPromiseContinuationEnvelope => (
  isEnvelope(o) && is.JSPromiseContinuation(o.content)
);
export const isPromiseEnvelope = isJSPromiseContinuationEnvelope; // Alias

export const promiseFromEnvelope = (
  envelope:  JSPromiseContinuationEnvelope
): Promise<any> | PromiseLike<any> => (
  envelope.content[2]
);

export const promiseStatusFromEnvelope = (
  envelope:  SuspendEnvelope
  ): "pending" | "fulfilled" | "rejected" => (
  envelope.content[3]
);

export type ExitEnvelope = Envelope & { content: LISP.Exit };

export const isExitEnvelope = (
  o: (any)
): o is ExitEnvelope => (
  isEnvelope(o) && is.Exit(o.content)
);

export const exitValueFromEnvelope = (
  envelope:  ExitEnvelope
): LISP.Object | null => (
  envelope.content[1]
);

// Other utilities.

export const hasOwnProperty = Object.prototype.hasOwnProperty;

// Note: cycle lists cause inifinite loop.
// Note; The last cdr will be ignored for improper lists.
export const listToArray = (list: LISP.List): LISP.Object[] => {
  const found = new Set<any>();
  const fn: typeof listToArray = (list) => {
    if (!is.Pair(list)) {
      return [];
    } else {
      const [, car, cdr] = list;
      if (found.has(cdr)) {
        throw new Error("Circular list detected.");
      }
      found.add(cdr);
      return [car, ...fn(is.List(cdr) ? cdr : ["<null>"])];
    }
  };
  return fn(list);
}

export const pairToArrayWithEnd = (pair: LISP.Pair): [LISP.Object[], LISP.Object] => {
  const found = new Set<any>();
  const fn: typeof pairToArrayWithEnd = (pair) => {
    const [, car, cdr] = pair;
    if (!is.Pair(cdr)) {
      return [[car], cdr];
    } else {
      if (found.has(cdr)) {
        throw new Error("Circular list detected.");
      }
      found.add(cdr);
      const [cdrArray, lastCdr] = pairToArrayWithEnd(cdr);
      return [[car, ...cdrArray], lastCdr];
    }
  }
  return fn(pair);
}

// Note: this function is almost same as create.List, but lastCdr/immutable/info can be specified.
// Note: If the length of array is 0, returns the last cdr.
export const arrayToList = <T extends LISP.Object = LISP.Null>(array: LISP.Object[], lastCdr?: T | null, immutable = false, info?: LISP.IPair[4]): LISP.List | T => {
  return array
    .reverse()
    .reduce<LISP.List | T>(
      (prev, curr, idx) => (info && idx === array.length - 1)
        ? create.Pair(curr, prev, immutable, info)
        : create.Pair(curr, prev, immutable),
      lastCdr || ["<null>"]
    );
}

// Note: Not used at this moment.
// https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
export const uuidv4 = (): string => (
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c, r = 0) => (
    r = (Math.random() * 16 | 0), c === "x" ? r : ((r & 0x3) | 0x8)
  ).toString(16))
);

// Generate a unique ID.
// Format: <time (14 letters)>-<sequence in a time(4 letters)>-<random(28 letters>)
// Longer than UUID.
export const uniqueId = (() => {
  let time = 0, curr = 0, seq = 0;
  return () => (
    "::" + "T-S-XXXXXXX".replace(/[TSX]/g, c => (
      curr = Date.now(),
      c === "T" ? `0000000000000${curr.toString(16)}`.slice(-14) :
        c === "S" ? `000${(time === curr ? (time = curr, seq = 0) : seq++).toString(16)}`.slice(-4) :
          `000${((Math.random() * (16 ** 4)) | 0).toString(16)}`.slice(-4)
    ))
  )
})();

export const isPromiseLike = <T, S>(obj: PromiseLike<T> | S): obj is PromiseLike<T> =>
  !!obj && (typeof obj === "object" || typeof obj === "function") &&
  typeof (obj as any).then === "function";

export const traverser = <T extends any, U extends (any | void)>(
  obj: T,
  func: (obj: T, childrenResults: U[] | null) => U,
  children: (obj: T) => T[] | null | undefined,
): U => func(
  obj,
  children(obj)?.map(
    child => traverser(child, func, children)
  ) ?? null
);

export const finder = <T extends any, U extends T = T>(
  obj: T,
  predicate: ((obj: T) => obj is U) | ((obj: T) => boolean),
  children: (obj: T) => T[] | null | undefined,
): U | null => {
  if (predicate(obj)) {
    return obj;
  } else {
    for (const c of children(obj) ?? []) {
      const ret = finder(c, predicate, children);
      if (ret !== undefined) {
        return ret;
      }
    }
    return null;
  }
}

export const plucker = <T extends any, U extends unknown>(
  obj: T,
  pluck: (obj: T) => U,
  children: (obj: T) => T[] | null | undefined,
): Exclude<U, undefined> | null => {
  const ret = pluck(obj);
  if (ret !== null && ret !== undefined) {
    return ret as any;
  } else {
    for (const c of children(obj) ?? []) {
      const ret = plucker(c, pluck, children);
      if (ret !== undefined) {
        return ret;
      }
    }
    return null;
  }
}

export const defineBuiltInProcedure = <
  T extends string = string,
  U extends BuiltInProcedureBody<Partial<Record<T, LISP.Object | LISP.Object[] | null>>> = BuiltInProcedureBody<Partial<Record<T, LISP.Object | LISP.Object[] | null>>>
>(
  name: string,
  parameters: LISP.ProcedureParameter<T>[],
  body: U,
  isMacro = false,
  hidden = false
): BuiltInProcedureDefinition<T, U> => {
  if (parameters.filter(p => p.type === "variadic").length > 1) {
    throw new Error("Only one variadic parameter is allowed.")
  }
  return { name, parameters, body, isMacro, hidden };
}

export const defineBuiltInProcedureAlias = <
  T extends BuiltInProcedureDefinition = BuiltInProcedureDefinition
>(
  name: string,
  definition: T
): T => {
  return { ...definition, name };
}

// An wrapper utility to debug built-in procedure.
export const wrapBuiltInProcedure = ({ name, parameters, body, isMacro, hidden }: ReturnType<typeof defineBuiltInProcedure>): ReturnType<typeof defineBuiltInProcedure> => {
  const logger = console;
  const wrapped: ReturnType<typeof defineBuiltInProcedure>["body"] = (args, itrp, stack) => {
    logger.log(
      `-----[Built-in Procedure Call "${name}"]-----\n` +
      `Is${isMacro ? "" : " NOT"} a macro procedure.\n` +
      "-----[Parameters]-----\n" +
      parameters.map((p, idx) => {
        const arg = args[p.name];
        if (is.Object(arg)) {
          return `${idx}:${p.name}: ${writeObject(arg, { maxdepth: 20 })}\n`;
        } else if (arg instanceof Array) {
          return `${idx}:${p.name}:length ${arg.length}}\n` + (arg as LISP.Object[]).map((a, i) => (
            ` [${i}]: ${writeObject(a, { maxdepth: 20 })}\n`
          )).join("");
        } else {
          return `${idx}:${p.name}: ${arg}\n`;
        }
      }).join("") +
      ` --------------------------------------------\n` +
      `Calling now...\n`
    );
    let ret: any;
    try {
      ret = body(args, itrp, stack);
    } catch (e) {
      logger.log(
        "-----[Exception]-----\n" +
        `Exception is${is.Object(e) ? "" : " NOT"} a LISP Object.\n` +
        (is.Object(e) ? writeObject(e, { maxdepth: 20 }) : `${e}`) + "\n" +
        "-----------------------"
      );
      throw e;
    }
    logger.log(
      "-----[Return]-----\n" +
      `Return value is ${is.Object(ret) ? "" : "NOT"} a LISP Object.\n` +
      (is.Object(ret) ? writeObject(ret, { maxdepth: 20 }) : `${ret}`) + "\n" +
      "-----------------------"
    );
    return ret;
  };
  return { name, parameters, body: wrapped, isMacro, hidden };
}

export const stringify = (value: (any), maxlength = 100, maxdepth = 5): string => {
  const fn = (tree: any, depth: number): string => {
    if (depth > maxdepth) {
      return "...";
    } else if (tree instanceof Array) {
      return "[" + tree.map(node => fn(node, depth + 1)).join(",") + "]";
    } else if (typeof tree === "object" && tree !== null) {
      if (tree.constructor.name === "Object") {
        return "{" +
          Object.entries(tree)
            .map(([k, v]) => `${k}:${fn(v, depth + 1)}`)
            .join(",") +
          "}"
      } else {
        return `<object ${tree.constructor.name}>`;
      }
    } else {
      return JSON.stringify(tree);
    }
  }
  const ret = fn(value, 1);
  return ret.length > maxlength ? ret.slice(0, maxlength - 3) + "..." : ret;
}

export const arrayShallowEquals = (a1: any[], a2: any[]): boolean => (
  a1.length === a2.length && a1.every((v, i) => v === a2[i])
);

// Convert lambda-style parameter list (formals) to LISP.ProcedureParameter[].
export const formalsToParameters = (formals: LISP.Object): [LISP.ProcedureParameter[], LISP.ProcedureParameter | null] => {
  if (is.List(formals)) {
    if (is.Null(formals)) {
      return [[], null];
    } else {
      const [cars, end] = pairToArrayWithEnd(formals);
      assert.Symbols(cars);
      if (!is.Null(end)) {
        assert.Symbol(end)
      }
      return [
        cars.map(car => ({ name: car[3] ?? car[1] })),
        !is.Null(end) ? { name: end[3] ?? end[1], type: "variadic" } : null
      ];
    }
  } else {
    assert.Symbol(formals);
    return [[], { name: formals[3] ?? formals[1], type: "variadic" }];
  }
}

// Serialize an object tree to JSON with cyclic and non-cyclic reference.
// There are 3 steps.
// 1. Study the tree to find objects to be tagged. Check if the data is serializable.
// 2. Clone the tree tagging refered objects and replacing referencing objects.
// 3. Serialize using JSON.stringify.(Note: JSON.stringify can't treat cyclic reference)
// "referenceTag" is used for tagging and reference.
//  - Tagged object: [referenceTag(string), identifier(number), object tree]
//  - Reference: [referenceTag(string), identifier(number)]
// If the tree has values below, an exception will be thrown.
//  - NaN/Infinity/-Infinity.
//  - Class instances. (other than Array or simple Object).
//  - bigint / symbol / undefined
//  - Arrays starting with referenceTag.
export const toReferentialJSON = (tree: (any), referenceTag: string): string => {
  // Step 1
  const founds = new Set<any>();
  const references = new Set<any>();
  const study = (value: any) => {
    if (value instanceof Array && value[0] === referenceTag) {
      const err =  new Error(`ReferenceTag "${referenceTag}" is already contained in the value.`);
      err.name = "reference-tag";
      throw err;
    } else if (typeof value === "object" && value !== null) { // Array or Object
      const name = value.constructor?.name;
      if (!(name === "Object" || name === "Array")) {
        throw new Error(`Unserializable object: <${typeof value} ${value.constructor?.name}>`);
      }
      if (founds.has(value)) {
        if (!references.has(value)) {
          references.add(value);
        }
        // Note: no more study.
      } else {
        founds.add(value);
        Object.keys(value).forEach(key => study(value[key]));
      }
    } else if (typeof value === "number" && (Number.isNaN(value) || !Number.isFinite(value))) {
      throw new Error("JSON can't contain Infinite/-Infinite/NaN");
    } else if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
      return;
    } else { // bigint / symbol / undefined
      throw new Error(`Unserializable object: <${typeof value}>`);
    }
  }
  study(tree);
  founds.clear(); // release memory.

  // Step2
  const identifiers = new Map<any, number>();
  const clone = (value: any, noRef = false): any => {
    if (!noRef && identifiers.has(value)) {
      return [referenceTag, identifiers.get(value)];
    } else if (!noRef && references.has(value)) {
      identifiers.set(value, identifiers.size + 1);
      return [referenceTag, identifiers.get(value), clone(value, true)];
    } else if (value instanceof Array) {
      return value.map(item => clone(item));
    } else if (typeof value === "object" && value !== null) {
      return Object.keys(value).reduce<any>((obj, key) => (obj[key] = clone(value[key]), obj), {});
    } else { // null, number, string, boolean
      return value;
    }
  }
  const cloned = clone(tree);
  references.clear(); // release memory
  identifiers.clear(); // release memory

  // Step3
  return JSON.stringify(cloned);
}

// Deserialize JSON made by toReferentialJSON.
// There are 3 steps.
// 1. Parse JSON string using JSON.parse.
// 2. Find tagged objects.
// 3. Replace tagged objects and reference objects.
export const fromReferentialJSON = (json: string, referenceTag: string): any => {
  // Step 1.
  const parsed = JSON.parse(json);

  // Step 2.
  const references = new Map<number, any>();
  const study = (value: (any)) => {
    if (value instanceof Array && value[0] === referenceTag && value.length >= 3) {
      references.set(value[1], value[2]);
      Object.keys(value[2]).forEach(key => study(value[2][key]));
    } else if (typeof value === "object" && value !== null) { // Array or Object
      Object.keys(value).forEach(key => study(value[key]));
    } // No need to study other values.
  }
  study(parsed);

  // Step 3.
  const replace = (value: (any)): any => {
    if (value instanceof Array && value[0] === referenceTag && references.has(value[1])) {
      if (value.length >= 3) {
        // Replace the content destructively to keep the reference from referers.
        const content = value[2];
        if (content instanceof Array) {
          content.splice(0, content.length, ...content.map(item => replace(item)));
          return content;
        } else {
          const obj = Object.keys(content).reduce<any>((o, key) => (o[key] = replace(content[key]), o), {});
          return Object.assign(content, obj);
        }
      } else {
        return references.get(value[1]);
      }
    } else if (value instanceof Array) {
      return value.map(item => replace(item));
    } else if (typeof value === "object" && value !== null) {
      return Object.keys(value).reduce<any>((obj, key) => (obj[key] = replace(value[key]), obj), {});
    } else {
      return value;
    }
  }
  return replace(parsed);
}

// From http://unicode.org/Public/UCD/latest/ucd/CaseFolding.txt
// 1. Exctract mappings with status C + S (= simple case folding).
// 2. Exclude mappings that is same as String.toLowerCase().
// Result: 102 mappings.
const foldcaseMap: Record<string, string> = {
  "\u{B5}": "\u{3BC}", "\u{345}": "\u{3B9}", "\u{3C2}": "\u{3C3}", "\u{3D0}": "\u{3B2}",
  "\u{3D1}": "\u{3B8}", "\u{3D5}": "\u{3C6}", "\u{3D6}": "\u{3C0}", "\u{3F0}": "\u{3BA}",
  "\u{3F1}": "\u{3C1}", "\u{3F5}": "\u{3B5}", "\u{13F8}": "\u{13F0}", "\u{13F9}": "\u{13F1}",
  "\u{13FA}": "\u{13F2}", "\u{13FB}": "\u{13F3}", "\u{13FC}": "\u{13F4}", "\u{13FD}": "\u{13F5}",
  "\u{1C80}": "\u{432}", "\u{1C81}": "\u{434}", "\u{1C82}": "\u{43E}", "\u{1C83}": "\u{441}",
  "\u{1C84}": "\u{442}", "\u{1C85}": "\u{442}", "\u{1C86}": "\u{44A}", "\u{1C87}": "\u{463}",
  "\u{1C88}": "\u{A64B}", "\u{1E9B}": "\u{1E61}", "\u{1FBE}": "\u{3B9}", "\u{AB70}": "\u{13A0}",
  "\u{AB71}": "\u{13A1}", "\u{AB72}": "\u{13A2}", "\u{AB73}": "\u{13A3}", "\u{AB74}": "\u{13A4}",
  "\u{AB75}": "\u{13A5}", "\u{AB76}": "\u{13A6}", "\u{AB77}": "\u{13A7}", "\u{AB78}": "\u{13A8}",
  "\u{AB79}": "\u{13A9}", "\u{AB7A}": "\u{13AA}", "\u{AB7B}": "\u{13AB}", "\u{AB7C}": "\u{13AC}",
  "\u{AB7D}": "\u{13AD}", "\u{AB7E}": "\u{13AE}", "\u{AB80}": "\u{13B0}", "\u{AB81}": "\u{13B1}",
  "\u{AB82}": "\u{13B2}", "\u{AB83}": "\u{13B3}", "\u{AB84}": "\u{13B4}", "\u{AB85}": "\u{13B5}",
  "\u{AB86}": "\u{13B6}", "\u{AB87}": "\u{13B7}", "\u{AB88}": "\u{13B8}", "\u{AB89}": "\u{13B9}",
  "\u{AB8A}": "\u{13BA}", "\u{AB8B}": "\u{13BB}", "\u{AB8C}": "\u{13BC}", "\u{AB8D}": "\u{13BD}",
  "\u{AB8E}": "\u{13BE}", "\u{AB90}": "\u{13C0}", "\u{AB91}": "\u{13C1}", "\u{AB92}": "\u{13C2}",
  "\u{AB93}": "\u{13C3}", "\u{AB94}": "\u{13C4}", "\u{AB95}": "\u{13C5}", "\u{AB96}": "\u{13C6}",
  "\u{AB97}": "\u{13C7}", "\u{AB98}": "\u{13C8}", "\u{AB99}": "\u{13C9}", "\u{AB9A}": "\u{13CA}",
  "\u{AB9B}": "\u{13CB}", "\u{AB9C}": "\u{13CC}", "\u{AB9D}": "\u{13CD}", "\u{AB9E}": "\u{13CE}",
  "\u{ABA0}": "\u{13D0}", "\u{ABA1}": "\u{13D1}", "\u{ABA2}": "\u{13D2}", "\u{ABA3}": "\u{13D3}",
  "\u{ABA4}": "\u{13D4}", "\u{ABA5}": "\u{13D5}", "\u{ABA6}": "\u{13D6}", "\u{ABA7}": "\u{13D7}",
  "\u{ABA8}": "\u{13D8}", "\u{ABA9}": "\u{13D9}", "\u{ABAA}": "\u{13DA}", "\u{ABAB}": "\u{13DB}",
  "\u{ABAC}": "\u{13DC}", "\u{ABAD}": "\u{13DD}", "\u{ABAE}": "\u{13DE}", "\u{ABB0}": "\u{13E0}",
  "\u{ABB1}": "\u{13E1}", "\u{ABB2}": "\u{13E2}", "\u{ABB3}": "\u{13E3}", "\u{ABB4}": "\u{13E4}",
  "\u{ABB5}": "\u{13E5}", "\u{ABB6}": "\u{13E6}", "\u{ABB7}": "\u{13E7}", "\u{ABB8}": "\u{13E8}",
  "\u{ABB9}": "\u{13E9}", "\u{ABBA}": "\u{13EA}", "\u{ABBB}": "\u{13EB}", "\u{ABBC}": "\u{13EC}",
  "\u{ABBD}": "\u{13ED}", "\u{ABBE}": "\u{13EE}",
};
const foldcaseRe = new RegExp("[" + Object.keys(foldcaseMap).join("") + "]", "g");
export const foldcase = (str: string): string => {
  return str.replace(foldcaseRe, c => foldcaseMap[c as any]).toLowerCase();
}
