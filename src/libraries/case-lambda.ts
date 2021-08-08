import type { BuiltInLibraryDefinition } from "../interpreter"
import { fromJS } from "../parser";
import { Dictionary, LISP } from "../types";
import { assert, create, defineBuiltInProcedure, formalsToParameters, uniqueId } from "../utils";

const caseLambda = defineBuiltInProcedure("case-lambda", [
  { name: "clauses", type: "variadic", evaluate: false },
], ({ clauses }) => {
  assert.Pairs(clauses);
  const args = uniqueId();
  const len = uniqueId();

  // IMPROVEME: rewrite this not using fromJS.
  const lambda = create.Procedure("built-in", "lambda");
  const cond = create.Procedure("built-in", "cond");
  const define = create.Procedure("built-in", "define");
  const apply = create.Procedure("built-in", "apply");
  const error = create.Procedure("built-in", "error");

  return fromJS([lambda, args,
    [define, len, ["length", args]],
    [cond,
      ...clauses.map(([, formals, body]) => {
        const [ups, vp] = formalsToParameters(formals);
        return [
          [(vp ? ">=" : "="), len, ups.length],
          [apply, ["lambda", formals, ...body], args],
        ];
      }),
      ["else", [error, `"No matching clause for case-lambda"`]]
    ]
  ]);
}, true, true);

const procedures = [caseLambda];
const CaseLambdaLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default CaseLambdaLibrary;
