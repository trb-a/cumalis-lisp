export declare const procedures: {
    suspend: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>, _itrp: import("./interpreter").Interpreter | undefined, stack: import("./types").LISP.CallStack | undefined) => never>;
};
