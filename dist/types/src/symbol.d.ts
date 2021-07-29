export declare const procedures: {
    symbolQ: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IBoolean>;
    symbolEQ: import("./interpreter").BuiltInProcedureDefinition<"symbol1" | "symbol2" | "symbols", ({ symbol1, symbol2, symbols }: Partial<Record<"symbol1" | "symbol2" | "symbols", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IBoolean>;
    symbolToString: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.IString>;
    stringToSymbol: import("./interpreter").BuiltInProcedureDefinition<"obj", ({ obj }: Partial<Record<"obj", import("./types").LISP.Object | import("./types").LISP.Object[] | null>>) => import("./types").LISP.ISymbol>;
};
