import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { contentCS, create, createCS, defineBuiltInProcedure } from "../utils";

const interactionEnvironment  = defineBuiltInProcedure("interaction-environment", [
], () => {
  const tempStack = createCS(create.Undefined());
  return create.EnvironmentSpec(contentCS(tempStack).env);
}, false, true);

const procedures = [interactionEnvironment];
const ReplLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default ReplLibrary;


