/* eslint-disable */
// @ts-check
/** @typedef { import("../src/index") } Scheme */
/** @typedef { import("../src/index").Envelope } Envelope */
/** @typedef { import("../src/index").LISP.Object } LObject */
/** @typedef { import("../src/index").LISP.Suspend } LSuspend */

/**  @type {Scheme} */
var L = window["Scheme"];
var itrp = new L.Interpreter();

// Load libraries and create "suspend" object (with envelope).
/** @type {LSuspend} */
var suspend;
var env;
try {
  itrp.eval(`
    (import (scheme base) (scheme eval) (scheme repl))
    (define env (interaction-environment))
    (eval
      '(import
        (scheme base)
        (scheme char)
        (scheme lazy)
        (scheme inexact)
        (scheme time)
        (scheme read)
        (scheme write)
        (scheme eval)
        (scheme case-lambda)
        (scheme cxr)) env)
    (eval (suspend env) env)
  `);
} catch (e) {
  if (L.isSuspendEnvelope(e)) {
    suspend = e.content;
    env = L.suspendValueFromEnvelope(e);
  }
}
if (!suspend || !L.is.EnvironmentSpec(env)) {
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
          L.forms.CallBuiltIn("suspend", obj),
          env
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
