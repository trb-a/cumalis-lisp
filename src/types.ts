/* eslint-disable */

// Misc. types.
export type ExceptFirst<F> = F extends [arg0: any, ...rest: infer R] ? R : never;
// Dictionary is plain JS object type that doesn't match to Arrays.
export type Dictionary<T = any> = {
  [x: string]: T;
  [y: number]: never;
};
export type Stack<T extends `#${string}-STACK#`, U> = [T, U, Stack<T, U> | null];
export type StackContent<T extends Stack<any, any>> = T extends Stack<any, infer U> ? U : never;
export type JSPromise<T> = Promise<T>; // Alias. (Note LISP.Promise is different from Javascript Promise)

export declare namespace LISP {
  // Definition of data classes.
  // Note for developer. If you add/modify the definition, be careful about equivalence.
  //   Basically, they are compared by "shallow equal". See implementations in equivalence.ts.
  // Note: Limited support for numbers. (supported as far as Javascript Number object does.)
  type ISymbol = (
    [className: "<symbol>", value: string] |
    [className: "<symbol>", value: string, ns: StaticNS | null, key: string | null]
  );
  type IString = [className: "<string>", value: string, immutable: boolean];
  type INumber = [className: "<number>", value: number | string];
  type IBoolean = [className: "<boolean>", value: boolean];
  type ICharacter = [className: "<character>", value: string];
  type IPair = [className: "<pair>", car: Object, cdr: Object, immutable: boolean, info?: Dictionary<string | number>];
  type INull = [className: "<null>"];
  type IVector = [className: "<vector>", values: Object[], immutable: boolean];
  type IByteVector = [className: "<bytevector>", values: number[], immutable: boolean];
  type IEndOfFile = [className: "<end-of-file>"];
  type IProcedure = (
    [className: "<procedure>", type: "built-in", name: string] |
    [className: "<procedure>", type: "lambda", parameters: ProcedureParameter[], body: Object, isMacro: boolean, env: Env]
  );
  // 4 kinds of ports: built-in, string, byte-vector, file (discriptor) of node.js.
  // Note: buffer also indicates whether binary port or textual port.
  type IPort = (
    [className: "<port>", type: "built-in", name: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] |
    [className: "<port>", type: "string", content: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string] |
    [className: "<port>", type: "bytevector", content: number[], mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: number[]] |
    [className: "<port>", type: "file", discriptor: number, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]]
  );
  type IRecordType = [className: "<record-type>", name: string];
  type IRecord = [className: "<record>", recordType: RecordType, fields: Dictionary<Object>];
  type IMultiValue = [className: "<multi-value>", values: Object[]];
  type IException = [className: "<exception>", stack: CallStack, condition: Object, continuable: boolean];
  // <undefined> is value to be set when the value is not defined or returning void value.
  // Setting an undefined value to variables, vectors, or records will occur erros.
  type IUndefined = [className: "<undefined>"];
  type IPromise = [className: "<promise>", thunk: Procedure | null, value: Object | null];
  type IError = [className: "<error>", name: string, message: string | null, irritants: Object[]];
  type IContinuation = [className: "<continuation>", stack: CallStack];
  // Only "flat", "non-vector", "proper list" patterns are supported for now.
  type ISyntaxRulePattern = [className: "<syntax-rule-pattern>", head: (Object | ISyntaxRulePattern)[], variadic: (Object | ISyntaxRulePattern) | null, tail: (Object | ISyntaxRulePattern)[], end: (Object | ISyntaxRulePattern) | null];
  type ISyntaxRules = [className: "<syntax-rules>", ellipsis: string, literals: string[], rules: [ISyntaxRulePattern, Object][]];
  type IParameter = [className: "<parameter>", name: string, converter: Procedure | null];
  type IEnvironmentSpec = [className: "<environment-spec>", env: Env];
  type ILibrary = [className: "<library>", exports: Dictionary<string>, env: Env]; // keyof exports = external, value of exports = internal.
  type IJS = (
    ["<js>", "built-in", string] |
    ["<js>", "inline", any]
  );



  // Grouped data classes.
  type Object = Symbol | String | Number | Boolean | Character | List |
    Vector | ByteVector | EndOfFile | Procedure | Port | RecordType | Record |
    MultiValue | SyntaxRules | Exception | Undefined | Promise | Error | EnvironmentSpec | Library | JS;
  type Symbol = ISymbol;
  type String = IString;
  type Number = INumber;
  type Boolean = IBoolean;
  type Character = ICharacter;
  type Pair = IPair;
  type List = IPair | INull;
  type Null = INull;
  type Vector = IVector;
  type ByteVector = IByteVector;
  type EndOfFile = IEndOfFile;
  type Port = IPort;
  type RecordType = IRecordType;
  type Record = IRecord;
  type MultiValue = IMultiValue;
  type Continuation = IContinuation;
  type SyntaxRules = ISyntaxRules;
  type EnvironmentSpec = IEnvironmentSpec;
  type Parameter = IParameter;
  type Procedure = IProcedure | IContinuation | IParameter;
  type Error = IError;
  type Exception = IException;
  type Undefined = IUndefined;
  type Promise = IPromise;
  type Library = ILibrary;
  type JS = IJS;

  // Detailed class
  type RealNumber = INumber & {1: number};

  // Special objects, (Not first class objects)
  // Note: Never contain directly in AST.
  type SpecialObject = Suspend | JSPromiseContinuation | CallStack | Stack<any, any>;
  type Suspend = [type: "#SUSPEND#", continuation: Continuation, value: Object];
  type JSPromiseContinuation = [type: "#JS-PROMISE-CONTINUATION#", continuation: Continuation, jsPromise: | JSPromise<any> | PromiseLike<any>, status: "pending" | "fulfilled" | "rejected"];
  type Exit = [type: "#EXIT#", value: Object | null];

  // Tokenizing, Parsing, AST
  type Token = string;
  type SourceInfo = Dictionary<string | number>;
  type TokenTree = Token | SourceInfo | TokenTree[];
  type JSToken = ["&", any];
  type ExtendedTokenTree = Token | number | null | boolean | JSToken | SourceInfo | Object | ExtendedTokenTree[]; // Note: Also accepts all AST Objects.
  type AST = Object;

  // Namespaces & environment
  type Namespace<T extends `#${string}-NS-STACK#`, U> = Stack<T, Dictionary<U>>;
  type NamespaceValue<T extends Namespace<any, any>> = T extends Namespace<any, infer U> ? U : never;
  type StaticNS = Namespace<"#STATIC-NS-STACK#", Object>;
  type DynamicNS = Namespace<"#DYNAMIC-NS-STACK#", Object>;
  type Env = { static: StaticNS, dynamic: DynamicNS };
  type EnvValue<T extends keyof Env> = NamespaceValue<Env[T]>;
  // Call-stack & call-frame.
  type CallStack = Stack<"#CALL-STACK#", {
    depth: number;
    env: Env;
    expr: Object;
    want: null | "oper" | "args" | number | "macro" | "return";
    oper: null | Procedure;
    args: null | (null | Object)[];
    before: null | Procedure;
    after: null | Procedure;
    handler: Stack<"#HANDLER-STACK#", Procedure> | null;
    info: null | SourceInfo;
  }>;

  // Type of parameters for procedures.
  // Note: Different from "parameters" that "parameterize" or "make-parameter" treats.
  type ProcedureParameter<
    T extends string = string,
    U extends "head" | "optional" | "variadic" | "tail" = "head" | "optional" | "variadic" | "tail"
    // Note: "end" parameter (not proper list) is not accepted for now. It's too difficult!
    // U extends "head" | "optional" | "variadic" | "tail" | "end" = "head" | "optional" | "variadic" | "tail" | "end"
    > = {
      name: T;
      type?: U; // default is "head".
      evaluate?: boolean; // default is true.
    };
  type InferProcedureParameterType<
    T extends ProcedureParameter<any, any>
    > = T extends ProcedureParameter<any, infer U> ? U : never;
}
