import { name as PACKAGE_NAME, version as PACKAGE_VERSION} from "../package.json";
import parser, { fromJS } from "./parser";
import { writeObject } from "./unparser";
import { Dictionary, LISP } from "./types";
import {
  create, forms, is,
  arrayCS, cloneCS, contentCS, transferCS, createCS, forkCS, parentCS,
  contentStack, nextStack, listToArray, pairToArrayWithEnd, addStaticNS, arrayToList,
  isPromiseLike, hasOwnProperty, isEnvelope, isSuspendEnvelope,
} from "./utils";
import type NodeFS_NS from "fs";

import { procedures as booleanProcedures } from "./boolean";
import { procedures as bytevectorProcedures } from "./bytevector";
import { procedures as characterProcedures } from "./character";
import { procedures as controlProcedures } from "./control";
import { procedures as equivalenceProcedures } from "./equivalence";
import { procedures as exceptionsProcedures } from "./exceptions";
import { procedures as expressionProcedures } from "./expression";
import { procedures as listProcedures } from "./list";
import { procedures as numberProcedures } from "./number";
import { procedures as portProcedures } from "./port";
import { procedures as stringProcedures } from "./string";
import { procedures as structureProcedures } from "./structure";
import { procedures as symbolProcedures } from "./symbol";
import { procedures as vectorProcedures } from "./vector";
import { procedures as systemProcedures } from "./system";
import { procedures as miscProcedures } from "./misc";

import WriteLibrary from "./libraries/write";
import ReadLibrary from "./libraries/read";
import LazyLibrary from "./libraries/lazy";
import TimeLibrary from "./libraries/time";
import InexactLibrary from "./libraries/inexact";
import CaseLambdaLibrary from "./libraries/case-lambda";
import CharLibrary from "./libraries/char";
import CxrLibrary from "./libraries/cxr";
import ProcessContextLibrary from "./libraries/process-context";
import FileLibrary from "./libraries/file";

// -------------------------------------------------------
//                       Consant
// -------------------------------------------------------
export { PACKAGE_NAME, PACKAGE_VERSION };

const BuiltInProcedureDefinitions: BuiltInProcedureDefinition[] = [
  ...Object.values(booleanProcedures),
  ...Object.values(bytevectorProcedures),
  ...Object.values(characterProcedures),
  ...Object.values(controlProcedures),
  ...Object.values(equivalenceProcedures),
  ...Object.values(exceptionsProcedures),
  ...Object.values(expressionProcedures),
  ...Object.values(listProcedures),
  ...Object.values(numberProcedures),
  ...Object.values(portProcedures),
  ...Object.values(stringProcedures),
  ...Object.values(structureProcedures),
  ...Object.values(symbolProcedures),
  ...Object.values(vectorProcedures),
  ...Object.values(systemProcedures),
  ...Object.values(miscProcedures),
];

const BuiltInLibraryDefinitions: Record<string, BuiltInLibraryDefinition> = {
  "(scheme write)": WriteLibrary,
  "(scheme read)": ReadLibrary,
  "(scheme lazy)": LazyLibrary,
  "(scheme time)": TimeLibrary,
  "(scheme inexact)": InexactLibrary,
  "(scheme case-lambda)": CaseLambdaLibrary,
  "(scheme char)": CharLibrary,
  "(scheme cxr)": CxrLibrary,
  "(scheme process-context)": ProcessContextLibrary,
  "(scheme file)": FileLibrary,
};

const BuiltInJSObjects: [string, LISP.Object][] = [
  // Nothing at this moment
];

export const DEFAULT_CALL_STACK_SIZE = 16384;

// -------------------------------------------------------
//                       Types
// -------------------------------------------------------

export type PlugIn = (itpr: Interpreter) => void;
export type InterpreterOptions = {
  plugins?: PlugIn[];
  stack?: number, // Stack size. Throw error when exceed this.
  debug?: boolean;  // Show debug messsages on console.
  verbose?: boolean; // Has meaning only if debug.
  acceptableJSValue?: (value: any) => boolean; // default is accept everything.
  fs?: typeof NodeFS_NS; // Node.js's "fs" module.
  beforeExecute?: (stack: LISP.CallStack, value: LISP.Object | null) => [stack: LISP.CallStack, value: LISP.Object] | undefined,
  afterExecute?: (next: LISP.CallStack | null, result: LISP.Object | null, current: LISP.CallStack, value: LISP.Object | null) => void,
  toplevelDepth?: number, // Change the depth of stack to think as toplevel. REPL may change this. Default: 1.
};

// Note: Functions that doesn't need itrp & stack can be called directly.
export type BuiltInProcedureBody<
  T extends Partial<Record<string, LISP.Object | LISP.Object[] | null>> = Partial<Record<string, LISP.Object | LISP.Object[] | null>>,
  U extends LISP.Object | LISP.CallStack = LISP.Object | LISP.CallStack
  > = (
    args: T,
    itrp?: Interpreter,
    stack?: LISP.CallStack,
  ) => U;

export type BuiltInProcedureDefinition<
  T extends string = string,
  U extends BuiltInProcedureBody<Record<T, LISP.Object | LISP.Object[] | null>> = BuiltInProcedureBody<Record<T, LISP.Object | LISP.Object[] | null>>
  > = {
    name: string,
    parameters: LISP.ProcedureParameter<T>[],
    body: U,
    isMacro?: boolean, // default: true
    hidden?: boolean, // default: false. If true, symbols can't get <procedure> object.
  }

export type BuiltInPortDefinition = {
  open?(mode: "r" | "w" | "rw", elementClass: number | null): void; // If not specified, the port can be opened without errors.
  close?(): void; // If not specified, the port can be closed without errors.
  // If not specified, reading from the port occur errors.
  // returning null means EOF. returning undefined or throwing <error> object means reading error.
  read?(type: "character" | "byte" | "line", elementClass: number | null): string | number | null | undefined;
  ready?(): boolean, // true means ready to read more than 1 byte.
  write?(content: string | Uint8Array): void; // If not specified, writing to the port occur errors.
  flush?(): void; // Not specified means everytime syncronized.
  binary?(): boolean; // Not specified means text mode.
};

export type BuiltInLibraryDefinition = (
  itrp: Interpreter,
) => Dictionary<LISP.Object>;

// Envelope (To throw/return special data with interpreter name and version).
export type Envelope = {
  language: string,
  version: string,
  content: LISP.Object | LISP.SpecialObject,
};

// -------------------------------------------------------
//                 The Interpreter class
// -------------------------------------------------------
const logger = console; // Alias just to avoid to use console directly.

export class Interpreter {
  private options: InterpreterOptions;
  private builtins = {
    jsObject: {} as Dictionary<any>,
    procedure: {} as Dictionary<BuiltInProcedureDefinition>,
    port: {
      "//input": {},
      "//output": { write: (str) => logger.log(str) },
      "//error": { write: (str) => logger.warn(str) },
    } as Dictionary<BuiltInPortDefinition>,
    static: {
      "current-input-port": create.Parameter("current-input-port", null),
      "current-output-port": create.Parameter("current-output-port", null),
      "current-error-port": create.Parameter("current-error-port", null),
    } as Dictionary<LISP.Object>,
    dynamic: {
      "current-input-port": create.Port("built-in", "//input", "r", null, ""),
      "current-output-port": create.Port("built-in", "//output", "w", null, ""),
      "current-error-port": create.Port("built-in", "//error", "w", null, ""),
    } as Dictionary<LISP.Object>,
    library: {} as Dictionary<BuiltInLibraryDefinition>,
  };
  // "fs" can be specified on node.js environment.
  // This enables writing to / reading from file discriptors as a port.
  fs: typeof NodeFS_NS | null = null; // Filesystem functions depends on this.

  constructor(options?: InterpreterOptions) {
    this.options = options ?? {};

    this.fs = options?.fs ?? null;

    BuiltInJSObjects.forEach(([name, value]) => this.setBuiltInJSObject(name, value));
    BuiltInProcedureDefinitions.forEach(definition => this.setBuiltInProcedure(definition));
    Object.keys(BuiltInLibraryDefinitions).forEach(key => this.setBuiltInLibrary(key, BuiltInLibraryDefinitions[key]));
    options?.plugins?.forEach(plugin => plugin(this));
  }

  getOptions(): InterpreterOptions {
    return this.options;
  }

  setBuiltInProcedure(definition: BuiltInProcedureDefinition, overwrite = false): LISP.Procedure {
    const obj = create.Procedure("built-in", definition.name);
    if (!overwrite && this.getProcedureContent(obj)) {
      return obj;
    }
    this.builtins.procedure[definition.name] = definition;
    return obj;
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  setBuiltInJSObject(name: string, value: any, overwrite = false): LISP.JS {
    const obj = create.JS("built-in", name);
    if (!overwrite && this.getJSObjectContent(obj)) {
      return obj;
    }
    this.builtins.jsObject[name] = value;
    return obj;
  }
  setBuiltInPort(name: string, value: BuiltInPortDefinition, overwrite = false): LISP.Port {
    const obj = create.Port("built-in", name, null, null, value.binary?.() ? [] : "");
    if (!overwrite && this.getBuiltInPort(name)) {
      return obj;
    }
    this.builtins.port[name] = value;
    return obj;
  }
  setBuiltInLibrary(name: string, value: BuiltInLibraryDefinition, overwrite = false): LISP.Symbol {
    if (!overwrite && this.getBuiltInPort(name)) {
      return create.Symbol(name);
    }
    this.builtins.library[name] = value;
    // Note: execute library function here, but expose no symbol.
    // Otherwize, deseriarized continuation may fail.
    // IMPROVEME: Separete definition of procedure and returning symbol list.
    value(this);

    return create.Symbol(name);
  }
  getProcedureContent(proc: LISP.Procedure): (
    { parameters: LISP.ProcedureParameter[], body: LISP.Object, isMacro: boolean, env: LISP.Env} |
    { parameters: LISP.ProcedureParameter[], body: BuiltInProcedureDefinition["body"], isMacro: boolean, env: null} |
    { parameters: LISP.ProcedureParameter[], body: LISP.Continuation, isMacro: boolean, env: null} |
    { parameters: LISP.ProcedureParameter[], body: LISP.Parameter, isMacro: boolean, env: null} |
    null
  ) {
    if (is.Continuation(proc)) {
      return {
        parameters: [{ name: "arg", evaluate: true, type: "variadic" }],
        body: proc, isMacro: false, env: null
      };
    } else if (is.Parameter(proc)) { // This parameter means "make-parameter"'s one, not procedure's parameter.
      return {
        parameters: [], body: proc, isMacro: false, env: null
      };
    } else if (proc[1] === "lambda") {
      const [,,parameters, body, isMacro, env] = proc;
      return { parameters, body, isMacro, env };
    } else {
      const [,, name] = proc;
      if (hasOwnProperty.call(this.builtins.procedure, name)) {
        const { parameters, body, isMacro = false } = this.builtins.procedure[name];
        return { parameters, body, isMacro, env: null}
      } else {
        return null;
      }
    }
  }
  getJSObjectContent(obj: LISP.JS): any | null {
    if (obj[1] === "inline") {
      return obj[2];
    } else {
      const name = obj[2];
      if (hasOwnProperty.call(this.builtins.jsObject, name)) {
        return this.builtins.jsObject[name];
      } else {
        return null;
      }
    }
  }
  getBuiltInPort(name: string): BuiltInPortDefinition | null {
    if (hasOwnProperty.call(this.builtins.port, name)) {
      return this.builtins.port[name];
    }
    return null;
  }
  getBuiltInLibrary(name: string): BuiltInLibraryDefinition | null {
    if (hasOwnProperty.call(this.builtins.library, name)) {
      return this.builtins.library[name];
    }
    return null;
  }

  defineStatic(ns: LISP.StaticNS, name: LISP.Symbol, value: LISP.Object): string {
    // Note: symbol[2] & [3] are set by syntax-rules.
    const str = name[3] ? name[3] : name[1];
    ns = name[2] ? name[2] : ns;
    contentStack(ns)[str] = value;
    return str;
  }
  defineDynamic(ns: LISP.DynamicNS, name: string, value: LISP.Object): string {
    contentStack(ns)[name] = value;
    return name;
  }
  setStatic(ns: LISP.StaticNS, name: LISP.Symbol, value: LISP.Object): LISP.Object | null {
    // Note: symbol[2] & [3] are set by syntax-rules.
    const str = name[3] ? name[3] : name[1];
    ns = name[2] ? name[2] : ns;
    for (let nss: LISP.StaticNS | null = ns; nss !== null; nss = nextStack(nss)) {
      const dic = contentStack(nss);
      if (hasOwnProperty.call(dic, str)) {
        return dic[str] = value;
      }
    }
    return null;
  }
  setDynamic(ns: LISP.DynamicNS, name: string, value: LISP.Object): LISP.Object | null {
    for (let nss: LISP.DynamicNS | null = ns; nss !== null; nss = nextStack(nss)) {
      const dic = contentStack(nss);
      if (hasOwnProperty.call(dic, name)) {
        return dic[name] = value;
      }
    }
    return null;
  }
  getStatic(ns: LISP.StaticNS, name: LISP.Symbol): LISP.Object | null {
    // Note: symbol[2] & [3] are set by syntax-rules.
    const str = name[3] ? name[3] : name[1];
    ns = name[2] ? name[2] : ns;
    for (let nss: LISP.StaticNS | null = ns; nss !== null; nss = nextStack(nss)) {
      const dic = contentStack(nss);
      if (hasOwnProperty.call(dic, str)) {
        return dic[str];
      }
    }
    if (hasOwnProperty.call(this.builtins.static, str)) {
      return this.builtins.static[str];
    }
    if (hasOwnProperty.call(this.builtins.procedure, str) && !this.builtins.procedure[str].hidden) {
      return ["<procedure>", "built-in", str];
    }
    return null;
  }
  getDynamic(ns: LISP.DynamicNS, name: string): LISP.Object | null {
    for (let nss: LISP.DynamicNS | null = ns; nss !== null; nss = nextStack(nss)) {
      const dic = contentStack(nss);
      if (hasOwnProperty.call(dic, name)) {
        return dic[name];
      }
    }
    if (hasOwnProperty.call(this.builtins.dynamic, name)) {
      return this.builtins.dynamic[name];
    }
    return null;
  }

  // Evaluate S-expressions.
  eval(text: string): LISP.Object {
    return this.evalAST(parser(text));
  }
  // Evaluate "extended token tree".
  evalJS(tree: LISP.ExtendedTokenTree): LISP.Object {
    return this.evalAST(forms.Begin(fromJS(tree)));
  }
  // Restart with #SUSPEND# object or Envelope with #SUSPEND.
  resume(suspend: Envelope | LISP.Suspend, value: LISP.Object = create.Undefined()): LISP.Object {
    if (isEnvelope(suspend) && !isSuspendEnvelope(suspend)) {
      throw new Error("The content of envelope is not #SUSPEND# object.");
    }
    const cont = isSuspendEnvelope(suspend) ? suspend.content[1] : suspend[1];
    return this.evalAST(forms.Begin(forms.Call(cont, value)));
  }
  // Evaluate a LISP Object.
  evalAST(ast: LISP.AST): LISP.Object {
    const start = createCS(ast);
    let value: LISP.Object | null = null;
    try {
      for (let current: LISP.CallStack | null = start; current;) {
        if (contentCS(current).depth > (this.options.stack ?? DEFAULT_CALL_STACK_SIZE)) {
          throw new Error("Call-stack overflow.");
        }
        if (this.options.beforeExecute) {
          [current, value] = this.options.beforeExecute(current, value) ?? [current, value];
        }
        if (this.options.debug) {
          logger.log(`Executing(${current[1].want ?? "initial"}/depth:${current[1].depth}) ${writeObject(current[1].expr)}` )
        }

        const [next, result] = this.execute(current, value);

        if (this.options.debug) {
          const ss = !next ? "finish"
            : parentCS(next) === current ? "wind"
              : parentCS(current) === next ? "unwind"
                : parentCS(next) === parentCS(next) ? "transfer"
                  : "unknown";
          logger.log(`Result: ${!result ? result : writeObject(result)} (${ss}).`);
          if (next && this.options.verbose) {
            logger.log(`Next(${next[1].want ?? "initial"}/depth:${next[1].depth}) ${writeObject(next[1].expr)}` );
          }
        }
        if (this.options.afterExecute) {
          this.options.afterExecute(next, result, current, value);
        }
        [current, value] = [next, result];
      }
    } catch (e) {
      if (is.Exception(e)) {
        const [, stack, v] = e;
        const [, name, message] = is.Error(v) ? v : [null, "exception", writeObject(v)];
        const trace = arrayCS(stack).map(([, { depth, want, expr, info }]) => (
          `${depth}: ${want ?? "initial"}: ${writeObject(expr, {maxdepth: 20}).slice(0,100)}: ${JSON.stringify(info)}`
        )).join("\n") + "\n";

        if (this.options.debug) {
          logger.log(`UNHANDLED ERROR: ${name}, ${message}\n${trace}`);
        }
        throw Object.assign<Error, Partial<Error>>(new Error(), {
          name,
          message: message ?? name,
          stack: trace,
        });
      } else if (is.Object(e) || is.SpecialObject(e)) {
        const envelope: Envelope = {
          language: PACKAGE_NAME,
          version: PACKAGE_VERSION,
          content: e,
        };
        throw envelope;
      } else {
        throw e;
      }
    }
    if (!value) {
      throw new Error("AST didn't return value");
    }
    return value;
  }

  // "execute" is executed per call-frame.
  // If call-frame (=continuation) wants something, given value will be accepted.
  private execute(stack: LISP.CallStack, given: LISP.Object | null): [LISP.CallStack | null, LISP.Object | null] {
    const cstack = cloneCS(stack);
    const frame = contentCS(cstack);
    const { expr } = frame;
    try {
      // If there is a given value and want to return it or use as expression, skip other processes.
      if (given) {
        if (frame.want === "return") {
          return [parentCS(cstack), given];
        } else if (frame.want === "macro") {
          return [transferCS(cstack, given), null];
        }
      }

      // Initial status.
      if (frame.want === null) {
        if (given) {
          if (is.MultiValue(given) && given[1].length === 0) {
            // Special case for exit.
            given = null;
          } else {
            throw create.Error("internal-error", `Call-frame was given a value without any want. "${frame.want}"`);
          }
        } if (is.Symbol(expr)) {
          // Variable references.
          // If symbol has call-stack reference, the value is taken from the stack's environment.
          // The call-stack reference is added by syntax-rules.
          const value = this.getStatic(expr[2] ?? contentCS(cstack).env.static, expr);
          if (!value) {
            throw create.Error("unbound-variable", `${expr[1]} is not defined.`);
          } else {
            return [parentCS(cstack), value];
          }
        } else if (is.Null(expr)) {
          // R7RS says: In many dialects of Lisp, the empty list, (),
          // is a legitimate expression evaluating to itself.
          // In Scheme, it is an error.
          throw create.Error("program-error", "Evaluating an empty list is an error in Scheme.")
        } else if (is.Pair(expr)) {
          // Procedure call. Start with operator evaluation.
          frame.want = "oper";
        } else {
          // literal expressions (except quote expressions)
          return [parentCS(cstack), expr];
        }
      }

      // Check the status.
      if (!is.Pair(expr)) {
        throw create.Error("internal-error", "Illegal status of call-frame. frane.want is not null, but expr is not a <pair>.");
      }

      // Get operator as procedure or evaluate it.
      if (frame.want === "oper") {
        if (given) {
          // Operator is evaluated by sub-evaluation.
          if (!is.Procedure(given)) {
            throw create.Error("not-a-procedure", "Operator evaluation didn't return a valid procedure");
          }
          frame.oper = given;
          frame.want = "args"; // starts arguments evaluation.
          given = null;
        } else if (is.Procedure(expr[1])) {
          // A procedure is directory specified at the head of the list. (Usually by macro procedures)
          frame.oper = expr[1];
          frame.want = "args"; // starts arguments evaluation.
        } else if (is.Symbol(expr[1]) || is.Pair(expr[1])) {
          // We want the operator be evaluated.
          return [forkCS(cstack, expr[1]), null];
        } else {
          throw create.Error("invalid-procedure", "Operator is not a valid procedure.");
        }
      }

      // Check the status.
      if (!frame.oper) {
        throw create.Error("internal-error", "Illegal status of call-frame. frame.want is not null or oper, but oper is still null.");
      }

      // Get the content of the procedure and parameters list.
      const proc = this.getProcedureContent(frame.oper);
      if (!proc) {
        throw create.Error("program-error", "Operator is not a valid procedure.");
      }
      const hps = proc.parameters.filter(p => !p.type || p.type === "head");
      const ops = proc.parameters.filter(p => p.type === "optional");
      const [vp] = proc.parameters.filter(p => p.type === "variadic"); // accepts only one.
      const tps = proc.parameters.filter(p => p.type === "tail");

      // Prepare arguments.
      if (frame.want === "args") {
        let arr: LISP.Object[];
        if (given) {
          arr = [given];
          given = null;
        } else {
          // IMPROVEME: if we support full function of syntax-rules,
          // end of improper list must be utilized.
          const [items] = pairToArrayWithEnd(expr);
          arr = items.slice(1); // first is operator.
        }
        if (arr.length === 1 && is.MultiValue(arr[0])) {
          // Given a multiple-value object.
          // The length of arguments is checked, but evaluations is skipped.
          const [[, values]] = arr;
          if (values.length < (hps.length + tps.length) || !vp && values.length > (hps.length + tps.length + ops.length)) {
            throw create.Error("arity-error", "Length of items in `multiple-value' object does not match the length of parameters.");
          }
          frame.args = values;
          frame.want = "return"; // Skip parameter evaluation.
        } else {
          // Other than multiple-value, Evaluation will be done according to the parameter difinitions.

          // Prepare arguments array (nulls are set for items to be evaluated) for evaluation.
          if (arr.length < (hps.length + tps.length) || !vp && arr.length > (hps.length + tps.length + ops.length)) {
            throw create.Error("arity-error", "Length of arguments does not match the length of parameters.");
          }
          // Make a array of parameters which length matches to the length of arguments (arr).
          const olen = Math.max(0, arr.length - hps.length - tps.length);
          const vlen = Math.max(0, arr.length - hps.length - ops.length - tps.length);
          const ps = [...hps, ...ops.slice(0, olen), ...Array.from({ length: vlen }, () => vp), ...tps];

          // Note: evaluate is true if ps[idx].evaluate is not defined.
          frame.args = arr.map((a, idx) => ((ps[idx].evaluate ?? true) && is.Evaluatable(a) ? null : a));
          frame.want = -1; // Start evaluation of arguments.
        }
      }

      // Check the status.
      if (!frame.args) {
        throw create.Error("internal-error", "Invalid status of call-frame. frame.want is not null, oper or args, but frame.args is still null.");
      }

      // Evaluate arguments if needed.
      if (typeof frame.want === "number") {
        if (given) {
          frame.args[frame.want] = given;
          given = null;
        }
        // Look for any unevaluated arguments. If found any, evaluate it.
        for (let i = 0, a = frame.args[i]; i < frame.args.length; a = frame.args[++i]) {
          if (a === null) {
            const arr = listToArray(expr).slice(1);
            frame.want = i;
            return [forkCS(cstack, arr[i]), null];
          }
        }

        // All arguments have been evaluated as requested.
        frame.want = "return";
      }

      // Check the status.
      if (!is.Objects(frame.args)) {
        throw create.Error("internal-error", "Invalid status of call-frame. frame.args contains non-objects.");
      }

      // Evaluated arguments.
      const args = frame.args;
      const olen = Math.max(0, args.length - hps.length - tps.length);
      const vlen = Math.max(0, args.length - hps.length - ops.length - tps.length);
      const ps = [...hps, ...ops.slice(0, olen), ...Array.from({length: vlen}, ()=>vp), ...tps];

      // Apply the procudure with evaluated arguments.
      if (frame.want === "return") {

        if (typeof proc.body === "function") {
          // Case of built-in procedures.

          // Build arguments dictionary.
          const dict = (vp ? { [vp.name]: [] as LISP.Object[] } : {}) as Dictionary<LISP.Object | LISP.Object[]>;
          for (let i = 0; i < ps.length; i++) {
            if (ps[i].type === "variadic") {
              (dict[ps[i].name] as LISP.Object[]).push(args[i]);
            } else {
              dict[ps[i].name] = args[i];
            }
          }

          // Let's call the JS function.
          // If the result is not a LISP object or LISP.CallStack,
          // and it is an acceptable value, wrap it in a JS object to treat in LISP.
          let ret: any;
          const { acceptableJSValue = () => true } = this.options;
          try {
            ret = proc.body(dict, this, cstack);
            if (!is.Object(ret) && !is.CallStack(ret)) {
              if (!acceptableJSValue(ret)) {
                throw create.Error("not-acceptable-js-value", null);
              } else {
                ret = create.JS("inline", ret);
              }
            }
          } catch (e) {
            if (is.Object(e) || is.SpecialObject(e)) {
              if (!is.Exception(e) && !is.SpecialObject(e)) {
                throw create.Exception(cstack, e, false);
              } else {
                throw e;
              }
            } else if (e instanceof Error) {
              throw e;
            } else {
              // Other Javascript values will be wrapped in Exception.
              throw create.Exception(cstack, create.JS("inline", e), false);
            }
          }

          // Check the result.
          if (is.CallStack(ret)) {
            return [ret, null];
          } else if (proc.isMacro) {
            // Case of macros.
            if (!is.Evaluatable(ret)) {
              // Don't re-evaluate the value if the result is a literal value.
              return [parentCS(cstack), ret];
            } else {
              // Macro results other than literal values will be re-evaluated on a transfererd call-frame.
              return [transferCS(cstack, ret), null];
            }
          } else {
            // Case of non-macro procedures. Unwind the call-frame with the result.
            return [parentCS(cstack), ret];
          }

        } else if (is.Continuation(proc.body)) {
          // Case of continuations.
          // Before calling the continuation itself, find common ancestral call-stack between current
          // call-stack and continuation's call-stack. Then find "after" procedure upto the common
          // call-stack and  "before" procedure upto the continuation's call-stack.If any "before"
          // or "after" procedure found. the procedure is executed. if the "before" or "after" returns,
          // the continuation is called again with the same argument.
          // Arguments given to a continuation become a <multi-value> object if the number of values is other than one..
          const cont = proc.body;
          const ascend = arrayCS(cstack);
          const descend = arrayCS(cont[1]).reverse();
          const dset = new Set(descend);
          const common = ascend.find(s => dset.has(s)) ?? null;
          const ascendUnder = !common ? ascend : ascend.slice(0, ascend.indexOf(common));
          const descendUnder = !common? descend : descend.slice(descend.indexOf(common) + 1);
          const carg: LISP.Object = args.length === 1 ? args[0] : create.MultiValue(args);
          for (const cs of ascendUnder) {
            const after = contentCS(cs).after;
            if (after) {
              const expr = forms.Begin(forms.Call(after), forms.Call(cont, create.MultiValue([carg])));
              // To avoid infinite loop, transfer CS for calling "after".
              return [transferCS(cs, expr, { before: null, after: null }), null];
            }
          }
          for (const cs of descendUnder) {
            const before = contentCS(cs).before;
            if (before) {
              const expr = forms.Begin(forms.Call(before), forms.Call(cont, create.MultiValue([carg])));
              // To avoid infinite loop, fork CS for calling "before".
              return [forkCS(cs, expr), null];
            }
          }
          return [cont[1], carg];

        } else if (is.Parameter(proc.body)) {
          // Case of parameter.
          const ret = this.getDynamic(contentCS(cstack).env.dynamic, proc.body[1]);
          if (!ret) {
            throw create.Error("unbound-variable", "Parameter is not defined.");
          }
          return [parentCS(cstack), ret];
        } else {
          // Case of lambda procedures.

          // Bind variables for the new static environment.
          // Create new environment with all the specified variables bound.
          const { dynamic: dynamicNS } = contentCS(stack).env;
          const newStaticNS = addStaticNS(proc.env!.static);
          const vargs: LISP.Object[] = [];
          for (let i = 0; i < ps.length; i++) {
            if (ps[i].type !== "variadic") {
              this.defineStatic(newStaticNS, create.Symbol(ps[i].name), args[i]);
            } else {
              vargs.push(args[i]);
            }
          }
          if (vp) {
            this.defineStatic(newStaticNS, create.Symbol(vp.name), arrayToList(vargs));
          }

          if (proc.isMacro) {
            // If procedure is a macro, wait for the expression that the procedure returns.
            contentCS(cstack).want = "macro";
            return [forkCS(cstack, proc.body, { env: {static: newStaticNS, dynamic: dynamicNS} }), null];
          } else {
            // "The last expression within the body of a lambda expression..., occurs in a tail context." (R7RS 3.5)
            return [transferCS(cstack, proc.body, { env: {static: newStaticNS, dynamic: dynamicNS} }), null];
          }
        }
      }

      // Can't come here!
      throw create.Error("internal-error", `Illegal status (want) of call-frame: ${frame.want}`);

    } catch (e) {
      // If the thrown object is an <error> object, wrap it in an <exception> object.
      // eslint-disable-next-line no-ex-assign
      e = is.Error(e) ? create.Exception(cstack, e, false) : e;
      // Handle <exception> objects.
      if (is.Exception(e)) {
        const [, estack, condition, continuable] = e;

        // If no handler, the exception will be thrown again.
        if (frame.handler) {
          // Generate a call-stack that calls the exception handler.
          // If the exception is "continuable" and the handler returns, the return value will be given to the
          // continuation of expression that caused the exception. If the exception is not continuable,
          // raise the error again.
          const handler = contentStack(frame.handler);
          if (continuable) {
            const cont = create.Continuation(parentCS(estack)!);
            const expr = forms.Call(cont, forms.Call(handler, create.MultiValue([condition])));
            return [transferCS(estack, expr, { handler: nextStack(frame.handler) }), null];
          } else {
            const expr = forms.Raise(forms.Call(handler, create.MultiValue([condition])));
            return [transferCS(estack, expr, { handler: nextStack(frame.handler) }), null];
          }
        } else {
          throw e;
        }
      } else if (is.JS(e) && e[1] === "built-in" && isPromiseLike(e[2])) {
        // If the exception is Javascript Promise object, wrap it in #<promise-continuation>
        // #<promise-continuation> keeps status of the promise.
        const pc = create.JSPromiseContinuation(create.Continuation(cstack), e[2], "pending");
        e[2].then(()=>pc[3] = "fulfilled", ()=>pc[3] = "rejected");
        throw pc;
      } else {
        // Throw away everyting other than LISP errors, LISP exception or JS promise,
        throw e;
      }
    }
  }
}

export default Interpreter;
