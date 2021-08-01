// Section "6.14. System interface"

import { create, defineBuiltInProcedure } from "./utils";
import { name as PACKAGE_NAME, version as PACKAGE_VERSION} from "../package.json";

// import { defineBuiltInProcedure  } from "./utils";

// (load filename) load library procedure

// (load filename environment-specifier) load library procedure

// (file-exists? filename) file library procedure

// (delete-file filename) file library procedure

// (command-line) process-context library procedure

// (exit) process-context library procedure

// (exit obj ) process-context library procedure

// (emergency-exit) process-context library procedure

// (emergency-exit obj ) process-context library procedure

// (get-environment-variable name) process-context library procedure

// (get-environment-variables) process-context library procedure

// (current-second) time library procedure

// (current-jiffy) time library procedure

// (jiffies-per-second) time library procedure


const features = defineBuiltInProcedure("features", [
], () => {
  return create.List(
    create.Symbol("r7rs"),
    create.Symbol(PACKAGE_NAME),
    create.Symbol(PACKAGE_NAME + "-" + PACKAGE_VERSION),
  );
});

export const procedures = {
  features
};
