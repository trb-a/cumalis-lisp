import type { BuiltInLibraryDefinition } from "../interpreter"
import { exact, inexact } from "../number";
import { Dictionary, LISP } from "../types";
import { assert, assertNonNull, contentCS, create, createCS, defineBuiltInProcedure, defineBuiltInProcedureAlias } from "../utils";

// Note: Includes syntax-keywords.
const procedureNames = `
  * +  - /  < <=  = >  >= abs  acos and  angle append  apply asin  assoc assq  assv atan
  begin boolean?  caaaar caaadr  caaar caadar  caaddr caadr  caar cadaar  cadadr cadar
  caddar cadddr  caddr cadr  call-with-current-continuation  call-with-input-file call-with-output-file
  call-with-values car  case cdaaar  cdaadr cdaar  cdadar cdaddr  cdadr cdar  cddaar cddadr
  cddar cdddar  cddddr cdddr  cddr cdr  ceiling char->integer  char-alphabetic? char-ci<=?
  char-ci<? char-ci=?  char-ci>=? char-ci>?  char-downcase char-lower-case?  char-numeric? char-ready?
  char-upcase char-upper-case?  char-whitespace? char<=?  char<? char=?  char>=? char>?
  char? close-input-port  close-output-port complex?  cond cons  cos current-input-port
  current-output-port define  define-syntax delay  denominator display  do dynamic-wind
  eof-object? eq?  equal? eqv?  eval even?  exact->inexact exact?  exp expt  floor for-each
  force gcd  if imag-part  inexact->exact inexact?   input-port? integer->char
  integer? interaction-environment  lambda lcm  length let
  let* let-syntax  letrec letrec-syntax  list list->string  list->vector list-ref
  list-tail list?  load log  magnitude make-polar  make-rectangular make-string
  make-vector map  max member  memq memv  min modulo  negative? newline  not null-environment
  null? number->string  number? numerator  odd? open-input-file  open-output-file or
  output-port? pair?  peek-char positive?  procedure? quasiquote  quote quotient  rational? rationalize
  read read-char  real-part real?  remainder reverse  round  scheme-report-environment
  set! set-car!  set-cdr! sin  sqrt string  string->list string->number  string->symbol string-append
  string-ci<=? string-ci<?  string-ci=? string-ci>=?  string-ci>? string-copy  string-fill! string-length
  string-ref string-set!  string<=? string<?  string=? string>=?  string>? string?  substring symbol->string
  symbol? tan  truncate values  vector vector->list  vector-fill! vector-length  vector-ref vector-set!
  vector? with-input-from-file  with-output-to-file write  write-char zero?
`.split(/(\s|\n)+/).filter(str => !/^\s*$/.test(str));

const syntaxKeywords = `
  and  begin  case  cond  do  if  lambda  let  let*  let-syntax  letrec  letrec-syntax  or  quasiquote  quote  set!
`.split(/(\s|\n)+/).filter(str => !/^\s*$/.test(str));

const schemeReportEnvironment = defineBuiltInProcedure("scheme-report-environment", [
  { name: "version" }
], ({version}, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.Number(version);
  if (version[1] !== 5) {
    throw create.Error("error", "scheme-report-environment only supports version 5.");
  }
  const tempStack = createCS(create.Undefined());
  for (const name of procedureNames) {
    if (itrp.getProcedureContent(create.Procedure("built-in", name))) {
      itrp.defineStatic(contentCS(tempStack).env.static, create.Symbol(name), create.Procedure("built-in", name));
    }
  }
  return create.EnvironmentSpec(contentCS(tempStack).env);
}, false, true);

const nullEnvironment = defineBuiltInProcedure("null-environment", [
  { name: "version" }
], ({version}, itrp, stack) => {
  assertNonNull(itrp);
  assertNonNull(stack);
  assert.Number(version);
  if (version[1] !== 5) {
    throw create.Error("error", "scheme-report-environment only supports version 5.");
  }
  const tempStack = createCS(create.Undefined());
  for (const name of syntaxKeywords) {
    if (itrp.getProcedureContent(create.Procedure("built-in", name))) {
      itrp.defineStatic(contentCS(tempStack).env.static, create.Symbol(name), create.Procedure("built-in", name));
    }
  }
  return create.EnvironmentSpec(contentCS(tempStack).env);
}, false, true);

const exactToInexact = defineBuiltInProcedureAlias("exact->inexact", inexact);
exactToInexact.hidden = true;

const inexactToExact = defineBuiltInProcedureAlias("inexact->exact", exact);
inexactToExact.hidden = true;

const procedures = [schemeReportEnvironment, nullEnvironment, exactToInexact, inexactToExact];
const R5RSLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  for (const name of procedureNames) {
    if (itrp.getProcedureContent(create.Procedure("built-in", name))) {
      dict[name] = create.Procedure("built-in", name);
    }
  }
  return dict;
}

export default R5RSLibrary;


