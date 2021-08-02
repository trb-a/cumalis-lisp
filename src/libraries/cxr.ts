import type { BuiltInLibraryDefinition } from "../interpreter"
import { Dictionary, LISP } from "../types";
import { assert, create, defineBuiltInProcedure } from "../utils";

const cxr = (pair: LISP.Pair, str: string): LISP.Object => {
  str = str.replace(/^c/, "").replace(/r$/, "");
  const last = str.slice(-1);
  const [, car, cdr] = pair;
  if (last === "a") {
    if (str.length <= 1) {
      return car;
    } else {
      assert.Pair(car);
      return cxr(car, str.slice(0, str.length - 1));
    }
  } else if (last === "d") {
    if (str.length <= 1) {
      return cdr;
    } else {
      assert.Pair(cdr);
      return cxr(cdr, str.slice(0, str.length - 1));
    }
  } else {
    throw create.Error("error", `Illegal cxr parameter ${str}`);
  }
}

const caaaar = defineBuiltInProcedure("caaaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caaaar");
}, false, true);

const caaadr = defineBuiltInProcedure("caaadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caaadr");
}, false, true);

const caaar = defineBuiltInProcedure("caaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caaar");
}, false, true);

const caadar = defineBuiltInProcedure("caadar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caadar");
}, false, true);

const caaddr = defineBuiltInProcedure("caaddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caaddr");
}, false, true);

const caadr = defineBuiltInProcedure("caadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caadr");
}, false, true);

const cadaar = defineBuiltInProcedure("cadaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cadaar");
}, false, true);

const cadadr = defineBuiltInProcedure("cadadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cadadr");
}, false, true);

const cadar = defineBuiltInProcedure("cadar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cadar");
}, false, true);

const caddar = defineBuiltInProcedure("caddar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caddar");
}, false, true);

const cadddr = defineBuiltInProcedure("cadddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cadddr");
}, false, true);

const caddr = defineBuiltInProcedure("caddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "caddr");
}, false, true);

const cdaaar = defineBuiltInProcedure("cdaaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdaaar");
}, false, true);

const cdaadr = defineBuiltInProcedure("cdaadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdaadr");
}, false, true);

const cdaar = defineBuiltInProcedure("cdaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdaar");
}, false, true);

const cdadar = defineBuiltInProcedure("cdadar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdadar");
}, false, true);

const cdaddr = defineBuiltInProcedure("cdaddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdaddr");
}, false, true);

const cdadr = defineBuiltInProcedure("cdadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdadr");
}, false, true);

const cddaar = defineBuiltInProcedure("cddaar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cddaar");
}, false, true);

const cddadr = defineBuiltInProcedure("cddadr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cddadr");
}, false, true);

const cddar = defineBuiltInProcedure("cddar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cddar");
}, false, true);

const cdddar = defineBuiltInProcedure("cdddar", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdddar");
}, false, true);

const cddddr = defineBuiltInProcedure("cddddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cddddr");
}, false, true);

const cdddr = defineBuiltInProcedure("cdddr", [
  {name: "pair"},
], ({pair}) => {
  assert.Pair(pair);
  return cxr(pair, "cdddr");
}, false, true);

const procedures = [
  caaaar, caaadr,
  caaar, caadar,
  caaddr, caadr,
  cadaar, cadadr,
  cadar, caddar,
  cadddr, caddr,
  cdaaar, cdaadr,
  cdaar, cdadar,
  cdaddr, cdadr,
  cddaar, cddadr,
  cddar, cdddar,
  cddddr, cdddr,
];

const CxrLibrary: BuiltInLibraryDefinition = (itrp) => {
  procedures.forEach(item => itrp.setBuiltInProcedure(item));
  const dict: Dictionary<LISP.Object> = {};
  procedures.forEach(({name}) => dict[name] = create.Procedure("built-in", name));
  return dict;
}

export default CxrLibrary;


