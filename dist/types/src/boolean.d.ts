export declare const procedures: {
    not: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IBoolean>;
    booleanQ: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IBoolean>;
    booleanEQ: import("./interpreter").BuiltInProcedureDefinition<"boolean1" | "boolean2" | "booleans", ({ boolean1, boolean2, booleans }: Partial<Record<"boolean1" | "boolean2" | "booleans", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IBoolean>;
};
