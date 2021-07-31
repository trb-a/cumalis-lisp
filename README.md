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
    * etc.
  - Some other built-in libraries: "(scheme read)" "(scheme write)".
  - Proper tail recursion. (tail call optimization)
  - Javascript interfaces
    * Adding built-in procedures.
    * Able to write expressions as Javascript Arrays and evaluate.
    * Able to contain Javascript objects in AST.
  - All objects, AST, and call-frames consist of pure JSON objects.
    * Continuations can be serialized to JSON strings. (Circular references need to be resolved.)
    * Comes with simple JSON serializer/deserializer as a utility. (toReferentialJSON / fromReferentialJSON)
  - No depencency.

  With these features, The following application fields can be considered.
    - Macro system for online applications. (Programs can be built as simple Javascript objects.)
    - Agent systems. (Send running application via network and continue to run on another machine.)
    - Games that need to save the running status.
    - Work-flow systems.
    - etc.

## Web REPL

  [Cumalis Lisp Web REPL](https://trb-a.github.io/cumalis-lisp/web-repl.html)

## How to use as a module

```typescript
import { Interpreter, toJS } from "cumalis-lisp";

const itrp = new Interpreter(); // Create interpreter.
const ret = itrp.eval(`(+ 1 1)`); // Evaluate S-expression.
const num = toJS(ret); // returns 2.
```

## R7RS Specification

[Revised7 Report on the Algorithmic Language Scheme](https://github.com/johnwcowan/r7rs-spec/blob/errata/spec/r7rs.pdf)

## Limitations

  - R7RS standard procedures other than (scheme base) (scheme read) (scheme write) libraries are not implemented.
  - Limited support for importing / exporting libraries.
    * "(scheme base)" is imported by default. Importing "(scheme base)" is just ignored.
    * "define-libary" "cond-expand" is not implemented. (But defining your own "built-in" library is supported.)
    * "import" can only import built-in libraries at the top-level.
    * Importing with "only" "except" "prefix" "rename" is not supported.
  - About number, only integer and real number is supported.
    * Complex / fraction number is not implemented.
    * 1.0 and 1 is same value. (like Javascript's number primitive).
    * "exact" means Number.isSafeInteger is true in Javascript.
    * In S-expressions, hexadecial, octal, binary literals can't have digits.
  - Limited syntax-rules support.
    * Only lists are supported for now. No vector rules.
    * Only flat patterns are supported. No nexted patterns.
    * Improper list patterns are not supported.
  - (eqv? "aaa" "aaa") returns #t. (like Javascript's "aaa" === "aaa" returns true).
  - #!fold-case does downcase (by Javascript's String.toLowerCase).
  - Strings doesn't handle surrogate pairs correctly. (Works like Javascript string).
  - "Standard feature identifiers" are not defined.
  - "exact-integer-sqrt is very slow, can calculate exact integer & positive value.
  - toReferentialJSON / fromReferentialJSON can't serialize Javascript's class instances
    except simple (not extended) "Object" or "Array" instance.

## TODO

  - Better documentation (espacially Javascript interfaces).
  - REPL for Node.js.
  - Expose all items in create, forms, part of functions and LISP that can be called directly for usability.
  - Review the parameter names of functions. (to match R7RS)
  - Add JSDocs.
  - Add async/await feature to handle Javascript's async functions.

## LICENSE

MIT
