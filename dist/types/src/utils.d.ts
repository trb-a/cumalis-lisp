import type { BuiltInProcedureBody, BuiltInProcedureDefinition, Envelope } from "./interpreter";
import { Dictionary, ExceptFirst, LISP, Stack, StackContent } from "./types";
export declare const numberToJSNumber: (n: LISP.INumber) => number;
export declare const JSNumberToNumber: (n: number) => LISP.INumber;
export declare const pushList: (list: LISP.List, item: LISP.Object) => LISP.IPair;
export declare const nextStack: <T extends Stack<any, any>>(stack: T) => T | null;
export declare const contentStack: <T extends Stack<any, any>>(stack: T) => StackContent<T>;
export declare const parentCS: (cs: LISP.CallStack) => LISP.CallStack | null;
export declare const arrayCS: (start: LISP.CallStack) => LISP.CallStack[];
export declare const contentCS: (cs: LISP.CallStack) => LISP.CallStack[1];
export declare const updateCS: (cs: LISP.CallStack, overwrite: Partial<LISP.CallStack[1]>) => LISP.CallStack;
export declare const createCS: (expr: LISP.Object) => LISP.CallStack;
export declare const cloneCS: (cs: LISP.CallStack) => LISP.CallStack;
export declare const forkCS: (parent: LISP.CallStack, expr: LISP.Object, overwrite?: Partial<Pick<LISP.CallStack[1], "env" | "before" | "after">>) => LISP.CallStack;
export declare const transferCS: (current: LISP.CallStack, expr: LISP.Object, overwrite?: Partial<Pick<LISP.CallStack[1], "env" | "before" | "after" | "handler" | "oper" | "want">>) => LISP.CallStack;
export declare const addStaticNS: (ns: LISP.StaticNS) => LISP.StaticNS;
export declare const addDynamicNS: (ns: LISP.DynamicNS) => LISP.DynamicNS;
export declare const create: {
    Symbol: (...args: ExceptFirst<LISP.ISymbol>) => LISP.ISymbol;
    String: (value: string, immutable: boolean) => LISP.IString;
    Number: (value: string | number) => LISP.INumber;
    Boolean: (value: boolean) => LISP.IBoolean;
    Character: (value: string) => LISP.ICharacter;
    Pair: (cons: LISP.Object, cdr: LISP.Object, immutable?: boolean, info?: Dictionary<string | number> | null | undefined) => LISP.IPair;
    Null: () => LISP.INull;
    Vector: (values: LISP.Object[], immutable: boolean) => LISP.IVector;
    ByteVector: (values: number[], immutable: boolean) => LISP.IByteVector;
    EndOfFile: () => LISP.IEndOfFile;
    Procedure: (...args: ExceptFirst<LISP.IProcedure>) => LISP.IProcedure;
    Port: (...args: ExceptFirst<LISP.IPort>) => LISP.IPort;
    RecordType: (name: string) => LISP.IRecordType;
    Record: (recordType: LISP.IRecordType, fields: Dictionary<LISP.Object>) => LISP.IRecord;
    SyntaxRules: (ellipsis: string, literals: string[], rules: [LISP.ISyntaxRulePattern, LISP.Object][]) => LISP.ISyntaxRules;
    Parameter: (name: string, converter: LISP.Procedure | null) => LISP.IParameter;
    MultiValue: (values: LISP.Object[]) => LISP.IMultiValue;
    Exception: (stack: LISP.CallStack, condition: LISP.Object, continuable: boolean) => LISP.IException;
    Undefined: () => LISP.IUndefined;
    Promise: (thunk: LISP.Procedure | null, value: LISP.Object | null) => LISP.IPromise;
    Error: (name: string, message: string | null, irritants?: LISP.Object[]) => LISP.IError;
    Continuation: (stack: LISP.CallStack) => LISP.IContinuation;
    JS: (...args: ExceptFirst<LISP.IJS>) => LISP.IJS;
    List: (...args: LISP.Object[]) => LISP.List;
    Suspend: (continuation: LISP.IContinuation, value: LISP.Object) => LISP.Suspend;
    JSPromiseContinuation: (continuation: LISP.IContinuation, jsPromise: PromiseLike<any> | import("./types").JSPromise<any>, status: "pending" | "fulfilled" | "rejected") => LISP.JSPromiseContinuation;
    StaticNS: (args_0: Dictionary<LISP.Object>, args_1: Stack<"#STATIC-NS-STACK#", Dictionary<LISP.Object>> | null) => LISP.Env["static"];
    DynamicNS: (args_0: Dictionary<LISP.Object>, args_1: Stack<"#DYNAMIC-NS-STACK#", Dictionary<LISP.Object>> | null) => LISP.Env["dynamic"];
    HandlerStack: (args_0: LISP.Procedure, args_1: Stack<"#HANDLER-STACK#", LISP.Procedure> | null) => Stack<"#HANDLER-STACK#", LISP.Procedure>;
};
export declare const forms: {
    Call: (oper: LISP.Object, ...args: LISP.Object[]) => LISP.List;
    CallBuiltIn: (name: string, ...args: LISP.Object[]) => LISP.List;
    Lambda: (...args: [params: LISP.Symbol[], variadic: LISP.Symbol | null, ...body: LISP.Object[]] | [params: LISP.List, ...body: LISP.Object[]]) => LISP.List;
    CallThunk: (...args: LISP.Object[]) => LISP.List;
    Begin: (...args: LISP.Object[]) => LISP.List;
    Quote: (arg: LISP.Object) => LISP.List;
    Set: (arg1: LISP.Symbol, arg2: LISP.Object) => LISP.List;
    Raise: (arg: LISP.Object) => LISP.List;
    RaiseContinuable: (arg: LISP.Object) => LISP.List;
    Let: (bindings: [LISP.Symbol, LISP.Object][], ...body: LISP.Object[]) => LISP.List;
    If: (arg1: LISP.Object, arg2: LISP.Object, arg3?: LISP.Object | undefined) => LISP.List;
    And: (...args: LISP.Object[]) => LISP.List;
    Or: (...args: LISP.Object[]) => LISP.List;
    Cond: (arg: LISP.IPair, ...args: LISP.Pair[]) => LISP.List;
    Case: (key: LISP.Object, clauses: LISP.Object[][]) => LISP.List;
    Define: (...args: [arg1: LISP.Symbol, arg2: LISP.Pair, arg3: LISP.Object] | [arg1: LISP.Symbol, arg2: LISP.Object]) => LISP.List;
    DefineValues: (formals: LISP.List | LISP.Symbol[], values: LISP.Object) => LISP.List;
    Append: (...args: LISP.Object[]) => LISP.List;
    Cons: (...args: LISP.Object[]) => LISP.List;
    Values: (...args: LISP.Object[]) => LISP.List;
    BeginIfMultiple: (...args: LISP.Object[]) => LISP.Object;
};
export declare const is: {
    Symbol: (v: unknown) => v is LISP.ISymbol;
    String: (v: unknown) => v is LISP.IString;
    Number: (v: unknown) => v is LISP.INumber;
    Boolean: (o: unknown) => o is LISP.IBoolean;
    Character: (o: unknown) => o is LISP.ICharacter;
    Pair: (v: unknown) => v is LISP.IPair;
    Null: (v: unknown) => v is LISP.INull;
    Vector: (v: unknown) => v is LISP.IVector;
    ByteVector: (v: unknown) => v is LISP.IByteVector;
    EndOfFile: (v: unknown) => v is LISP.IEndOfFile;
    Port: (o: unknown) => o is LISP.IPort;
    RecordType: (o: unknown) => o is LISP.IRecordType;
    Record: (o: unknown) => o is LISP.IRecord;
    MultiValue: (o: unknown) => o is LISP.IMultiValue;
    SyntaxRules: (o: unknown) => o is LISP.ISyntaxRules;
    Parameter: (o: unknown) => o is LISP.IParameter;
    Exception: (o: unknown) => o is LISP.IException;
    Undefined: (o: unknown) => o is LISP.IUndefined;
    Promise: (o: unknown) => o is LISP.IPromise;
    Error: (o: unknown) => o is LISP.IError;
    Continuation: (o: unknown) => o is LISP.IContinuation;
    JS: (o: unknown) => o is LISP.IJS;
    List: (v: unknown) => v is LISP.List;
    Procedure: (o: unknown) => o is LISP.Procedure;
    Object: (o: unknown) => o is LISP.Object;
    Evaluatable: (o: unknown) => o is LISP.ISymbol | LISP.List;
    False: (o: unknown) => o is LISP.IBoolean & {
        1: false;
    };
    RealNumber: (o: unknown) => o is LISP.RealNumber;
    IntegerNumber: (o: unknown) => o is LISP.RealNumber;
    Objects: (o: unknown) => o is LISP.Object[];
    Suspend: (o: unknown) => o is LISP.Suspend;
    JSPromiseContinuation: (o: unknown) => o is LISP.JSPromiseContinuation;
    CallStack: (o: unknown) => o is LISP.CallStack;
    SpecialObject: (o: unknown) => o is LISP.SpecialObject;
    Dictionary: (o: unknown) => o is Dictionary<any>;
    Stack: (o: unknown) => o is Stack<any, any>;
};
export declare const assert: {
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
    RecordType: (v: any, message?: string | undefined) => asserts v is LISP.IRecordType;
    Record: (v: any, message?: string | undefined) => asserts v is LISP.IRecord;
    MultiValue: (v: any, message?: string | undefined) => asserts v is LISP.IMultiValue;
    Port: (v: any, message?: string | undefined) => asserts v is LISP.IPort;
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
    RealNumber: (v: any, message?: string | undefined) => asserts v is LISP.RealNumber;
    IntegerNumber: (v: any, message?: string | undefined) => asserts v is LISP.RealNumber;
    RealNumbers: (vs: any, message?: string | undefined) => asserts vs is LISP.RealNumber[];
    IntegerNumbers: (vs: any, message?: string | undefined) => asserts vs is LISP.RealNumber[];
};
export declare const assertNonNull: <T = unknown>(v: T) => asserts v is NonNullable<T>;
export declare const assertArray: (v: unknown) => asserts v is Array<any>;
export declare const isDictionary: (o: unknown) => o is Dictionary<any>;
export declare const hasOwnProperty: (v: PropertyKey) => boolean;
export declare const listToArray: (list: LISP.List) => LISP.Object[];
export declare const pairToArrayWithEnd: (pair: LISP.IPair) => [LISP.Object[], LISP.Object];
export declare const arrayToList: <T extends LISP.Object = LISP.INull>(array: LISP.Object[], lastCdr?: T | null | undefined, immutable?: boolean, info?: LISP.IPair[4]) => LISP.List | T;
export declare const uuidv4: () => string;
export declare const uniqueId: () => string;
export declare const isPromiseLike: <T, S>(obj: S | PromiseLike<T>) => obj is PromiseLike<T>;
export declare const traverser: <T extends unknown, U extends unknown>(obj: T, func: (obj: T, childrenResults: U[] | null) => U, children: (obj: T) => T[] | null | undefined) => U;
export declare const finder: <T extends unknown, U extends T = T>(obj: T, predicate: ((obj: T) => obj is U) | ((obj: T) => boolean), children: (obj: T) => T[] | null | undefined) => U | null;
export declare const plucker: <T extends unknown, U extends unknown>(obj: T, pluck: (obj: T) => U, children: (obj: T) => T[] | null | undefined) => Exclude<U, undefined> | null;
export declare const defineBuiltInProcedure: <T extends string = string, U extends BuiltInProcedureBody<Partial<Record<T, LISP.Object | LISP.Object[] | null>>, LISP.Object | LISP.CallStack> = BuiltInProcedureBody<Partial<Record<T, LISP.Object | LISP.Object[] | null>>, LISP.Object | LISP.CallStack>>(name: string, parameters: LISP.ProcedureParameter<T, "optional" | "head" | "variadic" | "tail">[], body: U, isMacro?: boolean, hidden?: boolean) => BuiltInProcedureDefinition<T, U>;
export declare const defineBuiltInProcedureAlias: <T extends BuiltInProcedureDefinition<string, BuiltInProcedureBody<Record<string, LISP.Object | LISP.Object[] | null>, LISP.Object | LISP.CallStack>> = BuiltInProcedureDefinition<string, BuiltInProcedureBody<Record<string, LISP.Object | LISP.Object[] | null>, LISP.Object | LISP.CallStack>>>(name: string, definition: T) => T;
export declare const wrapBuiltInProcedure: ({ name, parameters, body, isMacro, hidden }: ReturnType<typeof defineBuiltInProcedure>) => ReturnType<typeof defineBuiltInProcedure>;
export declare const stringify: (value: (any), maxlength?: number, maxdepth?: number) => string;
export declare const arrayShallowEquals: (a1: any[], a2: any[]) => boolean;
export declare const formalsToParameters: (formals: LISP.Object) => [LISP.ProcedureParameter[], LISP.ProcedureParameter | null];
export declare const isEnvelope: (o: (any)) => o is Envelope;
export declare const isCurrentVersionEnvelope: (o: (any)) => o is Envelope;
export declare type SuspendEnvelope = Envelope & {
    content: LISP.Suspend;
};
export declare const isSuspendEnvelope: (o: (any)) => o is SuspendEnvelope;
export declare const suspendValueFromEnvelope: (envelope: SuspendEnvelope) => LISP.Object;
export declare const toReferentialJSON: (tree: (any), referenceTag: string) => string;
export declare const fromReferentialJSON: (json: string, referenceTag: string) => any;
export declare const foldcase: (str: string) => string;
