import type { BuiltInLibraryDefinition } from "../interpreter";
import { LISP } from "../types";
export declare const openInputFile: import("../interpreter").BuiltInProcedureDefinition<"str", ({ str }: Partial<Record<"str", LISP.Object | LISP.Object[] | null>>, itrp: import("../interpreter").Interpreter | undefined) => LISP.IPort>;
declare const FileLibrary: BuiltInLibraryDefinition;
export default FileLibrary;
