import { LISP } from "./types";
export declare const Import: import("./interpreter").BuiltInProcedureDefinition<"sets", ({ sets }: Partial<Record<"sets", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
export declare const procedures: {
    Import: import("./interpreter").BuiltInProcedureDefinition<"sets", ({ sets }: Partial<Record<"sets", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
    define: import("./interpreter").BuiltInProcedureDefinition<"arg1" | "arg2", ({ arg1, arg2 }: Partial<Record<"arg1" | "arg2", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
    defineValues: import("./interpreter").BuiltInProcedureDefinition<"expr" | "formals", ({ formals, expr }: Partial<Record<"expr" | "formals", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
    defineSyntax: import("./interpreter").BuiltInProcedureDefinition<"keyword" | "spec", ({ keyword, spec }: Partial<Record<"keyword" | "spec", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
    defineRecordType: import("./interpreter").BuiltInProcedureDefinition<"name" | "ctor" | "pred" | "fields", ({ name, ctor, pred, fields }: Partial<Record<"name" | "ctor" | "pred" | "fields", LISP.Object | LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined, stack: LISP.CallStack | undefined) => LISP.Object>;
    makeRecord: import("./interpreter").BuiltInProcedureDefinition<"type", ({ type }: Partial<Record<"type", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    recordTypeQ: import("./interpreter").BuiltInProcedureDefinition<"type" | "rec", ({ rec, type }: Partial<Record<"type" | "rec", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    recordGet: import("./interpreter").BuiltInProcedureDefinition<"rec" | "field", ({ rec, field }: Partial<Record<"rec" | "field", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
    recordSetD: import("./interpreter").BuiltInProcedureDefinition<"value" | "rec" | "field", ({ rec, field, value }: Partial<Record<"value" | "rec" | "field", LISP.Object | LISP.Object[] | null>>) => LISP.Object>;
};
