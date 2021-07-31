/* eslint-disable */
// @ts-check
/** @typedef { import("../src/index") } Scheme */
/** @typedef { import("../src/index").Envelope } Envelope */
/** @typedef { import("../src/index").LISP.Object } LObject */
/** @typedef { import("../src/index").LISP.Suspend } LSuspend */
/// <reference path="../types/jquery.terminal.d.ts"/>

// Just an alias to avoid to write console-dot-log.
var logger = console;

/**  @type {Scheme} */
var L = window["Scheme"];
// Normally, the depth of the call-stack to be taken as "top level" is set to 1.
// In this REPL, it is changed to 2. Because the expressions are evaluated in the
// form like:
//   (eval (suspend <expression-as-toplevel>))
// See R7RS 5.3.1. "Top level definitions".
var itrp = new L.Interpreter({ toplevelDepth: 2 });

// IMPROVEME: delete this once we have implemented "eval library"
itrp.setBuiltInProcedure(
  L.defineBuiltInProcedure("eval", [
    { name: "obj" }
  ], function (args) {
    if (!L.is.Object(args["obj"])) {
      throw new Error("Not a object");
    }
    return args["obj"];
  }, true)
);

/** @type {LSuspend} */
var suspend;
try {
  itrp.evalAST(
    L.forms.CallBuiltIn("eval",
      L.forms.CallBuiltIn("suspend")
    )
  );
} catch (e) {
  if (L.isSuspendEnvelope(e)) {
    suspend = e.content;
  }
}
if (!suspend) {
  throw new Error("No suspend!")
}

$("#term").terminal(function (cmd, t) {
  /** @type {LObject} */
  try {
    var obj = L.parser(cmd);
    itrp.resume(suspend,
      L.forms.CallBuiltIn("quote",
        L.forms.CallBuiltIn("eval",
          L.forms.CallBuiltIn("suspend",
            obj
          )
        )
      )
    );
  } catch (e) {
    if (L.isSuspendEnvelope(e)) {
      suspend = e.content;
      t.echo(L.writeObject(L.suspendValueFromEnvelope(e)));
    } else {
      throw e;
    }
  }
}, {
  greetings: `Cumalis Lisp Web REPL`,
  keymap: {
    "CTRL+C": function () { } // disable the original function.
  }
});
