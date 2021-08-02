/* eslint-disable */
// @ts-check
/** @typedef { import("../src/index") } Scheme */
/** @typedef { import("../src/index").Envelope } Envelope */
/** @typedef { import("../src/index").LISP.Object } LObject */
/** @typedef { import("../src/index").LISP.Suspend } LSuspend */

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

// Load libraries and create "suspend" object (with envelope).
/** @type {LSuspend} */
var suspend;
try {
  itrp.evalAST(
    L.forms.CallBuiltIn("eval",
      L.forms.CallBuiltIn("suspend",
        L.fromJS(["import",
          ["scheme", "base"],
          ["scheme", "char"],
          ["scheme", "lazy"],
          ["scheme", "inexact"],
          ["scheme", "time"],
          ["scheme", "read"],
          ["scheme", "write"],
          ["scheme", "case-lambda"],
          ["scheme", "cxr"],
        ])
      )
    )
  );
} catch (e) {
  if (L.isSuspendEnvelope(e)) {
    suspend = e.content;
  }
}
if (!suspend) {
  throw new Error("No suspend object!");
}

var terminal = $("#term").terminal(function (cmd, t) {
  if (/^\s*$/.test(cmd)) {
    return;
  }
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
  greetings: "[[b;#FFFFFF;]<<<Welcome to Cumalis Lisp Web REPL>>]\n" +
    "Standard libraries (base char lazy inexact time read write case-lambda cxr) are already imported.",
  keymap: {
    "CTRL+C": function () { } // disable the original functsion.
  }
});

// Set default font size on the terminal.
terminal.css("--size", "1.5");

// Connect default output-port to the terminal.
itrp.setBuiltInPort("//output", {
  write: function (value) {
    if (typeof value === "string") {
      terminal.echo("[[;#07C7ED;]" + value + "]");
    }
  }
}, true);
