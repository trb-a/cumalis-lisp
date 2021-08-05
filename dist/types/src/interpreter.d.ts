/// <reference types="node" />
import { name as PACKAGE_NAME, version as PACKAGE_VERSION } from "../package.json";
import { Dictionary, LISP } from "./types";
import type NodeFS_NS from "fs";
export { PACKAGE_NAME, PACKAGE_VERSION };
export declare const DEFAULT_CALL_STACK_SIZE = 16384;
export declare type PlugIn = (itpr: Interpreter) => void;
export declare type InterpreterOptions = {
    plugins?: PlugIn[];
    stack?: number;
    debug?: boolean;
    verbose?: boolean;
    acceptableJSValue?: (value: any) => boolean;
    fs?: typeof NodeFS_NS;
    beforeExecute?: (stack: LISP.CallStack, value: LISP.Object | null) => [stack: LISP.CallStack, value: LISP.Object] | undefined;
    afterExecute?: (next: LISP.CallStack | null, result: LISP.Object | null, current: LISP.CallStack, value: LISP.Object | null) => void;
};
export declare type BuiltInProcedureBody<T extends Partial<Record<string, LISP.Object | LISP.Object[] | null>> = Partial<Record<string, LISP.Object | LISP.Object[] | null>>, U extends LISP.Object | LISP.CallStack = LISP.Object | LISP.CallStack> = (args: T, itrp?: Interpreter, stack?: LISP.CallStack) => U;
export declare type BuiltInProcedureDefinition<T extends string = string, U extends BuiltInProcedureBody<Record<T, LISP.Object | LISP.Object[] | null>> = BuiltInProcedureBody<Record<T, LISP.Object | LISP.Object[] | null>>> = {
    name: string;
    parameters: LISP.ProcedureParameter<T>[];
    body: U;
    isMacro?: boolean;
    hidden?: boolean;
};
export declare type BuiltInPortDefinition = {
    open?(mode: "r" | "w" | "rw", elementClass: number | null): void;
    close?(): void;
    read?(type: "character" | "byte" | "line", elementClass: number | null): string | number | null | undefined;
    ready?(): boolean;
    write?(content: string | Uint8Array): void;
    flush?(): void;
    binary?(): boolean;
};
export declare type BuiltInLibraryDefinition = (itrp: Interpreter) => Dictionary<LISP.Object>;
export declare type Envelope = {
    language: string;
    version: string;
    content: LISP.Object | LISP.SpecialObject;
};
export declare class Interpreter {
    private options;
    private builtins;
    fs: typeof NodeFS_NS | null;
    constructor(options?: InterpreterOptions);
    getOptions(): InterpreterOptions;
    setBuiltInProcedure(definition: BuiltInProcedureDefinition, overwrite?: boolean): LISP.Procedure;
    setBuiltInJSObject(name: string, value: any, overwrite?: boolean): LISP.JS;
    setBuiltInPort(name: string, value: BuiltInPortDefinition, overwrite?: boolean): LISP.Port;
    setBuiltInLibrary(name: string, value: BuiltInLibraryDefinition, overwrite?: boolean): LISP.Symbol;
    getProcedureContent(proc: LISP.Procedure): ({
        parameters: LISP.ProcedureParameter[];
        body: LISP.Object;
        isMacro: boolean;
        env: LISP.Env;
    } | {
        parameters: LISP.ProcedureParameter[];
        body: BuiltInProcedureDefinition["body"];
        isMacro: boolean;
        env: null;
    } | {
        parameters: LISP.ProcedureParameter[];
        body: LISP.Continuation;
        isMacro: boolean;
        env: null;
    } | {
        parameters: LISP.ProcedureParameter[];
        body: LISP.Parameter;
        isMacro: boolean;
        env: null;
    } | null);
    getJSObjectContent(obj: LISP.JS): any | null;
    getBuiltInPort(name: string): BuiltInPortDefinition | null;
    getBuiltInLibrary(name: string): BuiltInLibraryDefinition | null;
    defineStatic(ns: LISP.StaticNS, name: LISP.Symbol, value: LISP.Object): string;
    defineDynamic(ns: LISP.DynamicNS, name: string, value: LISP.Object): string;
    setStatic(ns: LISP.StaticNS, name: LISP.Symbol, value: LISP.Object): LISP.Object | null;
    setDynamic(ns: LISP.DynamicNS, name: string, value: LISP.Object): LISP.Object | null;
    getStatic(ns: LISP.StaticNS, name: LISP.Symbol): LISP.Object | null;
    getDynamic(ns: LISP.DynamicNS, name: string): LISP.Object | null;
    eval(text: string): LISP.Object;
    evalJS(tree: LISP.ExtendedTokenTree): LISP.Object;
    resume(suspend: Envelope | LISP.Suspend, value?: LISP.Object): LISP.Object;
    evalAST(ast: LISP.AST): LISP.Object;
    private execute;
}
export default Interpreter;
