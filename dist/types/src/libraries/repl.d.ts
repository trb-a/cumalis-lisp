import type { BuiltInLibraryDefinition } from "../interpreter";
import { LISP } from "../types";
export declare const interactionEnvironment: import("../interpreter").BuiltInProcedureDefinition<string, () => LISP.IEnvironmentSpec>;
declare const ReplLibrary: BuiltInLibraryDefinition;
export default ReplLibrary;
