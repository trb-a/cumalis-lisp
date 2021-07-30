/* eslint-disable */
// @ts-check
/** @typedef { import("../src/index") } Scheme */
/** @typedef { import("../src/index").Envelope } Envelope */
/** @typedef { import("../src/index").LISP.Object } LObject */
/** @typedef { import("../src/index").LISP.Suspend } LSuspend */

var logger = console;

/**  @type {Scheme} */
var L = window["Scheme"];
var itrp = new L.Interpreter({ toplevelDepth: 2 });

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
// IMPROVEME need to find a way to be toplevel.
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
  greetings: `Cumalis Lisp REPL`,
  keymap: {
    "CTRL+C": function () { } // disable the original function.
  }
});
