export declare type ExceptFirst<F> = F extends [arg0: any, ...rest: infer R] ? R : never;
export declare type Dictionary<T = any> = {
    [x: string]: T;
    [y: number]: never;
};
export declare type Stack<T extends `#${string}-STACK#`, U> = [T, U, Stack<T, U> | null];
export declare type StackContent<T extends Stack<any, any>> = T extends Stack<any, infer U> ? U : never;
export declare type JSPromise<T> = Promise<T>;
export declare namespace LISP {
    type ISymbol = ([
        className: "<symbol>",
        value: string
    ] | [
        className: "<symbol>",
        value: string,
        ns: StaticNS | null,
        key: string | null
    ]);
    type IString = [className: "<string>", value: string, immutable: boolean];
    type INumber = [className: "<number>", value: number | string];
    type IBoolean = [className: "<boolean>", value: boolean];
    type ICharacter = [className: "<character>", value: string];
    type IPair = [className: "<pair>", car: Object, cdr: Object, immutable: boolean, info?: Dictionary<string | number>];
    type INull = [className: "<null>"];
    type IVector = [className: "<vector>", values: Object[], immutable: boolean];
    type IByteVector = [className: "<bytevector>", values: number[], immutable: boolean];
    type IEndOfFile = [className: "<end-of-file>"];
    type IProcedure = ([
        className: "<procedure>",
        type: "built-in",
        name: string
    ] | [
        className: "<procedure>",
        type: "lambda",
        parameters: ProcedureParameter[],
        body: Object,
        isMacro: boolean,
        env: Env
    ]);
    type IPort = ([
        className: "<port>",
        type: "built-in",
        name: string,
        mode: "r" | "w" | "rw" | null,
        elementClass: number | null,
        buffer: string | number[]
    ] | [
        className: "<port>",
        type: "string",
        content: string,
        mode: "r" | "w" | "rw" | null,
        elementClass: number | null,
        buffer: string
    ] | [
        className: "<port>",
        type: "bytevector",
        content: number[],
        mode: "r" | "w" | "rw" | null,
        elementClass: number | null,
        buffer: number[]
    ] | [
        className: "<port>",
        type: "file",
        discriptor: number,
        mode: "r" | "w" | "rw" | null,
        elementClass: number | null,
        buffer: string | number[]
    ]);
    type IRecordType = [className: "<record-type>", name: string];
    type IRecord = [className: "<record>", recordType: RecordType, fields: Dictionary<Object>];
    type IMultiValue = [className: "<multi-value>", values: Object[]];
    type IException = [className: "<exception>", stack: CallStack, condition: Object, continuable: boolean];
    type IUndefined = [className: "<undefined>"];
    type IPromise = [className: "<promise>", stack: CallStack, expr: Object];
    type IError = [className: "<error>", name: string, message: string | null, irritants: Object[]];
    type IContinuation = [className: "<continuation>", stack: CallStack];
    type ISyntaxRulePattern = [className: "<syntax-rule-pattern>", head: Object[], variadic: Object | null, tail: Object[]];
    type ISyntaxRules = [className: "<syntax-rules>", ellipsis: string, literals: string[], rules: [ISyntaxRulePattern, LISP.Object][]];
    type IParameter = [className: "<parameter>", name: string, converter: Procedure | null];
    type IJS = ([
        "<js>",
        "built-in",
        string
    ] | [
        "<js>",
        "inline",
        any
    ]);
    type Object = Symbol | String | Number | Boolean | Character | List | Vector | ByteVector | EndOfFile | Procedure | Port | RecordType | Record | MultiValue | SyntaxRules | Exception | Undefined | Promise | Error | JS;
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
    type Parameter = IParameter;
    type Procedure = IProcedure | IContinuation | IParameter;
    type Error = IError;
    type Exception = IException;
    type Undefined = IUndefined;
    type Promise = IPromise;
    type JS = IJS;
    type RealNumber = INumber & {
        1: number;
    };
    type SpecialObject = Suspend | JSPromiseContinuation | CallStack | Stack<any, any>;
    type Suspend = [type: "#SUSPEND#", continuation: Continuation, value: Object];
    type JSPromiseContinuation = [type: "#PROMISE-CONTINUATION#", continuation: Continuation, jsPromise: JSPromise<any> | PromiseLike<any>, status: "pending" | "fulfilled" | "rejected"];
    type Token = string;
    type SourceInfo = Dictionary<string | number>;
    type TokenTree = Token | SourceInfo | TokenTree[];
    type JSToken = ["&", any];
    type ExtendedTokenTree = Token | number | null | boolean | JSToken | SourceInfo | Object | ExtendedTokenTree[];
    type AST = Object;
    type Namespace<T extends `#${string}-NS-STACK#`, U> = Stack<T, Dictionary<U>>;
    type NamespaceValue<T extends Namespace<any, any>> = T extends Namespace<any, infer U> ? U : never;
    type StaticNS = Namespace<"#STATIC-NS-STACK#", Object>;
    type DynamicNS = Namespace<"#DYNAMIC-NS-STACK#", Object>;
    type Env = {
        static: StaticNS;
        dynamic: DynamicNS;
    };
    type EnvValue<T extends keyof Env> = NamespaceValue<Env[T]>;
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
    type ProcedureParameter<T extends string = string, U extends "head" | "optional" | "variadic" | "tail" = "head" | "optional" | "variadic" | "tail"> = {
        name: T;
        type?: U;
        evaluate?: boolean;
    };
    type InferProcedureParameterType<T extends ProcedureParameter<any, any>> = T extends ProcedureParameter<any, infer U> ? U : never;
}
