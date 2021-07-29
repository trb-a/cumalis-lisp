import { LISP } from "./types";
export declare const append: import("./interpreter").BuiltInProcedureDefinition<"args", ({ args }: Partial<Record<"args", LISP.Object | LISP.Object[] | null>>) => [className: "<symbol>", value: string] | [className: "<symbol>", value: string, ns: LISP.StaticNS | null, key: string | null] | LISP.IString | LISP.INumber | LISP.IBoolean | LISP.ICharacter | LISP.IPair | LISP.INull | LISP.IVector | LISP.IByteVector | LISP.IEndOfFile | [className: "<procedure>", type: "built-in", name: string] | [className: "<procedure>", type: "lambda", parameters: LISP.ProcedureParameter<string, "optional" | "head" | "variadic" | "tail">[], body: LISP.Object, isMacro: boolean, env: LISP.Env] | LISP.IContinuation | LISP.IParameter | [className: "<port>", type: "built-in", name: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | [className: "<port>", type: "string", content: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string] | [className: "<port>", type: "bytevector", content: number[], mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: number[]] | [className: "<port>", type: "file", discriptor: number, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | LISP.IRecordType | LISP.IRecord | LISP.IMultiValue | LISP.ISyntaxRules | LISP.IException | LISP.IUndefined | LISP.IPromise | LISP.IError | ["<js>", "built-in", string] | ["<js>", "inline", any]>;
export declare const procedures: {
    pairQ: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
    cons: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IPair>;
    car: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    cdr: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    setCarD: import("./interpreter").BuiltInProcedureDefinition<"obj" | "pair", ({ pair, obj }: Partial<Record<"obj" | "pair", LISP.Object | LISP.Object[] | null>>) => LISP.IPair>;
    setCdrD: import("./interpreter").BuiltInProcedureDefinition<"obj" | "pair", ({ pair, obj }: Partial<Record<"obj" | "pair", LISP.Object | LISP.Object[] | null>>) => LISP.IPair>;
    caar: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    cadr: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    cdar: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    cddr: import("./interpreter").BuiltInProcedureDefinition<"pair", ({ pair }: Partial<Record<"pair", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    nullQ: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
    listQ: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
    makeList: import("./interpreter").BuiltInProcedureDefinition<"fill" | "k", ({ k, fill }: Partial<Record<"fill" | "k", LISP.Object | LISP.Object[] | null>>) => LISP.List>;
    list: import("./interpreter").BuiltInProcedureDefinition<"objs", ({ objs }: Partial<Record<"objs", LISP.Object | LISP.Object[] | null>>) => LISP.List>;
    length: import("./interpreter").BuiltInProcedureDefinition<"list", ({ list }: Partial<Record<"list", LISP.Object | LISP.Object[] | null>>) => LISP.INumber>;
    append: import("./interpreter").BuiltInProcedureDefinition<"args", ({ args }: Partial<Record<"args", LISP.Object | LISP.Object[] | null>>) => [className: "<symbol>", value: string] | [className: "<symbol>", value: string, ns: LISP.StaticNS | null, key: string | null] | LISP.IString | LISP.INumber | LISP.IBoolean | LISP.ICharacter | LISP.IPair | LISP.INull | LISP.IVector | LISP.IByteVector | LISP.IEndOfFile | [className: "<procedure>", type: "built-in", name: string] | [className: "<procedure>", type: "lambda", parameters: LISP.ProcedureParameter<string, "optional" | "head" | "variadic" | "tail">[], body: LISP.Object, isMacro: boolean, env: LISP.Env] | LISP.IContinuation | LISP.IParameter | [className: "<port>", type: "built-in", name: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | [className: "<port>", type: "string", content: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string] | [className: "<port>", type: "bytevector", content: number[], mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: number[]] | [className: "<port>", type: "file", discriptor: number, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | LISP.IRecordType | LISP.IRecord | LISP.IMultiValue | LISP.ISyntaxRules | LISP.IException | LISP.IUndefined | LISP.IPromise | LISP.IError | ["<js>", "built-in", string] | ["<js>", "inline", any]>;
    reverse: import("./interpreter").BuiltInProcedureDefinition<"list", ({ list }: Partial<Record<"list", LISP.Object | LISP.Object[] | null>>) => LISP.List>;
    listTail: import("./interpreter").BuiltInProcedureDefinition<"k" | "list", ({ list, k }: Partial<Record<"k" | "list", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    listRef: import("./interpreter").BuiltInProcedureDefinition<"k" | "list", ({ list, k }: Partial<Record<"k" | "list", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    listSetD: import("./interpreter").BuiltInProcedureDefinition<"obj" | "k" | "list", ({ list, k, obj }: Partial<Record<"obj" | "k" | "list", LISP.Object | LISP.Object[] | null>>) => ["<undefined>"]>;
    memq: import("./interpreter").BuiltInProcedureDefinition<"obj" | "list", ({ obj, list }: Partial<Record<"obj" | "list", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    memv: import("./interpreter").BuiltInProcedureDefinition<"obj" | "list", ({ obj, list }: Partial<Record<"obj" | "list", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    member: import("./interpreter").BuiltInProcedureDefinition<"obj" | "list" | "compare", ({ obj, list, compare }: Partial<Record<"obj" | "list" | "compare", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean | LISP.List>;
    assq: import("./interpreter").BuiltInProcedureDefinition<"obj" | "alist", ({ obj, alist }: Partial<Record<"obj" | "alist", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    assv: import("./interpreter").BuiltInProcedureDefinition<"obj" | "alist", ({ obj, alist }: Partial<Record<"obj" | "alist", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    assoc: import("./interpreter").BuiltInProcedureDefinition<"obj" | "compare" | "alist", ({ obj, alist, compare }: Partial<Record<"obj" | "compare" | "alist", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean | LISP.List>;
    listCopy: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", LISP.Object | LISP.Object[] | null>>) => [className: "<symbol>", value: string] | [className: "<symbol>", value: string, ns: LISP.StaticNS | null, key: string | null] | LISP.IString | LISP.INumber | LISP.IBoolean | LISP.ICharacter | LISP.List | LISP.IVector | LISP.IByteVector | LISP.IEndOfFile | [className: "<procedure>", type: "built-in", name: string] | [className: "<procedure>", type: "lambda", parameters: LISP.ProcedureParameter<string, "optional" | "head" | "variadic" | "tail">[], body: LISP.Object, isMacro: boolean, env: LISP.Env] | LISP.IContinuation | LISP.IParameter | [className: "<port>", type: "built-in", name: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | [className: "<port>", type: "string", content: string, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string] | [className: "<port>", type: "bytevector", content: number[], mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: number[]] | [className: "<port>", type: "file", discriptor: number, mode: "r" | "w" | "rw" | null, elementClass: number | null, buffer: string | number[]] | LISP.IRecordType | LISP.IRecord | LISP.IMultiValue | LISP.ISyntaxRules | LISP.IException | LISP.IUndefined | LISP.IPromise | LISP.IError | ["<js>", "built-in", string] | ["<js>", "inline", any]>;
};