import { LISP } from "./types";
export declare const eqvQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
export declare const eqQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
export declare const equalQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
export declare const procedures: {
    eqvQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
    eqQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
    equalQ: import("./interpreter").BuiltInProcedureDefinition<"obj1" | "obj2", ({ obj1, obj2 }: Partial<Record<"obj1" | "obj2", LISP.Object | LISP.Object[] | null>>) => LISP.IBoolean>;
};
