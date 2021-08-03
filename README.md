# Cumalis Lisp

Cumalis Lisp is a stack-based implementation of R7RS Scheme Language
in Typescript.

Can be used as a library in web browsers or Node.js environment.

## Installation

```bash
$ yarn add cumalis-lisp
# or
$ npm install cumalis-lisp
```

## Features

- Most of R7RS (small) "(scheme base)" library, including:
  * call-with-current-continuation (call/cc).
  * guard / with-exception-handler / raise / raise-continuable.
  * dynamic-wind.
  * make-parameter / parameterize.
  * define-record-type.
  * let-values / values.
  * limited support for syntax-rules (see Limitations).
  * quasiquote.
  * nested multiline comments.
  * etc.
- Other standard libraries implemented:
  * (scheme read)
  * (scheme write)
  * (scheme promise)
  * (scheme time)
  * (scheme inexact)
  * (scheme case-lambda)
  * (scheme char)
  * (scheme cxr)
  * (scheme process-context)
  * (scheme file)
- Proper tail recursion. (tail call optimization)
- Javascript interfaces
  * Adding built-in procedures.
  * Able to write expressions as Javascript Arrays and evaluate.
  * Able to contain Javascript objects in AST.
- All objects, AST, and call-frames consist of pure JSON objects.
  * Continuations can be serialized to JSON strings. (Circular references need to be resolved.)
  * Simple JSON serializer/deserializer utility is bundled. (toReferentialJSON / fromReferentialJSON)
- No dependency.

With these features, The following application fields can be considered.

- Macro system for online applications. (Programs can be built as simple Javascript objects.)
- Agent systems. (Send running application via network and continue to run on another machine.)
- Games that need to save the running status.
- Work-flow systems.
- etc.

## Web REPL

  [Cumalis Lisp Web REPL](https://trb-a.github.io/cumalis-lisp/web-repl.html)

## How to use as a module

### Basic usage

```typescript
import { Interpreter, toJS } from "cumalis-lisp";

const itrp = new Interpreter(); // Create interpreter.
const ret = itrp.eval(`
  (define (fib n)
    (if (<= n 2)
        1
        (+ (fib (- n 1)) (fib (- n 2)))))
  (fib 10)
`); // Evaluate S-expression.
const num = toJS(ret); // returns 2.
```

### Defining built-in procedures / built-in macros

```typescript
const itrp = new Interpreter(); // Create interpreter.
const helloProc = defineBuiltInProcedure("hello", [ // Define procedure
  { name: "obj" }
], function ({obj}) {
  if (!is.Object(obj)) {
    throw new Error("Not a object");
  }
  console.log(`Hello ${toJS(obj)}`);
  return create.Number(42);
});
const hello2Proc = defineBuiltInProcedure("hello2", [ // Define macro
  { name: "obj" }
], function ({obj}) {
  if (!is.Object(obj)) {
    throw new Error("Not a object");
  }
  return fromJS(["string-append", `"HELLO "`, obj]); // Write LISP as JS array.
}, true); // <-- this "true" indicates macro.

itrp.setBuiltInProcedure(helloProc); // Set the procedure to the interpreter.
itrp.setBuiltInProcedure(hello2Proc); // Set the procedure to the interpreter.

console.log(toJS(itrp.eval(`(hello "world")`))); // => 42
console.log(toJS(itrp.eval(`(hello2 "WORLD")`))); // => HELLO WORLD

```

### Suspend / serialize / deserialize / resume

```Typescript
  const itrp = new Interpreter(); // Create interpreter.

  // Suspend
  let suspend: SuspendEnvelope | null = null;
  try {
    itrp.eval(`(+ 11 (suspend "SUSPEND HERE"))`);
  } catch (e) {
    if (isSuspendEnvelope(e)) {
      suspend = e;
    } else {
      throw e;
    }
  }
  if (suspend) {
    console.log(toJS(suspendValueFromEnvelope(suspend))); // => "SUSPEND HERE"

    // Serialize/Deserialize
    const json = toReferentialJSON(suspend, "$$$");
    const revived: LISP.Suspend = fromReferentialJSON(json, "$$$");

    // Resume
    const ret = itrp.resume(revived, create.Number(31));
    console.log(toJS(ret)); // => 42
  }

```

### Using files

To handle files on Node.js, "fs" object must be set as option when you
create a Interpreter instance.

```Typescript
  import fs from "fs";
  const itrp = new Interpreter({fs}); // <= set "fs" object as option.
  itrp.eval(`
    (import (scheme file))
    (if (file-exists? "some-file.txt")
      (with-input-from-file "some-file.txt"
        (define x (read-line))
        ...
    (with-output-to-file "some-other-file.txt"
      (lambda ()
        (write-char #\a)
        (write-string "ABC")
        (newline)
        ...
    (delete-file "some-file.txt")
  `);
```

Note: If you want to serialize / deserialize suspended continuations, open files status (seek position, open/close status, etc) can't be recovered when you deserialize / resume. It will cause unexpected behaviour. Be sure to close files before serialization.

## R7RS Specification

[Revised7 Report on the Algorithmic Language Scheme](https://github.com/johnwcowan/r7rs-spec/blob/errata/spec/r7rs.pdf)

## Limitations

  - R7RS standard libraries listed below are not implemented.
    * (scheme complex)
    * (scheme eval)
    * (scheme repl)
    * (scheme r5rs)
  - Limited support for importing / exporting libraries.
    * "(scheme base)" is imported by default. Importing "(scheme base)" is just ignored.
    * "import" can only import built-in libraries at the top-level.
    * Importing with "only" "except" "prefix" "rename" is not supported.
    * "define-library" "cond-expand" "include" and "include-cli" are not implemented.
      (But you can define your own "built-in" procedures and libraries.)
  - About number, only integer and real number is supported.
    * Complex / fraction number is not implemented.
    * 1.0 and 1 is same value. (like Javascript's number primitive).
    * "exact" means Number.isSafeInteger is true in Javascript.
    * In S-expressions, hexadecimal, octal, binary literals can't have digits.
  - Limited syntax-rules support.
    * Only lists are supported for now. No vector rules.
    * Only flat patterns are supported. No nested patterns.
    * Improper list patterns are not supported.
  - Strings doesn't handle surrogate pairs correctly. (Works like Javascript string).
  - About file library.
    * char-ready? u8-ready? raise errors for file ports. Because Node.js doesn't seem to have any ftell(3) equivalent. read-char read-line etc. may block until complete reading.

## Notes
  - (eqv? "aaa" "aaa") returns #t. (like Javascript's "aaa" === "aaa" returns true).
  - toReferentialJSON / fromReferentialJSON don't respect "toJSON" property of class instances. If you want to include class instances in serialization, please consider other serializers like js-yaml, etc.
  - exit / emergency-exit does't do process.exit() but throws an Envelope object that isExitEnvelope() returns true, so that users can catch it and  perform proper finalizations.
 
## TODOs / Future plans

  - Better documentation (especially Javascript interfaces more).
  - REPL for Node.js.
  - Expose all items in create, forms, part of functions and LISP that can be called directly for usability.
  - Review the parameter names of functions. (to match R7RS)
  - Add JSDocs.
  - Add async/await feature to handle Javascript's async functions.
  - Add some built-in library to handle <js> objects.
  - It will be nice if there are Regular expressions(SRFI-115), Hashtables(SRFI-69), Handling date and time(SRFI-19), Sorting lists and vectors, etc.

## LICENSE

MIT
