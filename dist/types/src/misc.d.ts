export declare const readFile: import("./interpreter").BuiltInProcedureDefinition<"filename" | "cli", ({ filename, cli }: Partial<Record<"filename" | "cli", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined) => import("./types").LISP.Object>;
export declare const procedures: {
    suspend: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>, _itrp: import("./interpreter").Interpreter | undefined, stack: import("./types").LISP.CallStack | undefined) => never>;
    readFile: import("./interpreter").BuiltInProcedureDefinition<"filename" | "cli", ({ filename, cli }: Partial<Record<"filename" | "cli", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>, itrp: import("./interpreter").Interpreter | undefined) => import("./types").LISP.Object>;
};
