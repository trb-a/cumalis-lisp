// Procedures/syntaxes in base-library introduced by R7RS
// Section "6.5. Symbols" are defined in this file.

import { assert, create, is, defineBuiltInProcedure } from "./utils";

const symbolQ = defineBuiltInProcedure("symbol?", [
  { name: "obj" }
], ({ obj }) => {
  assert.Object(obj);
  return create.Boolean(is.Symbol(obj));
});

const symbolEQ = defineBuiltInProcedure("symbol=?", [
  { name: "symbol1" },
  { name: "symbol2" },
  { name: "symbols", type: "variadic" },
], ({ symbol1, symbol2, symbols }) => {
  assert.Symbol(symbol1);
  assert.Symbol(symbol2);
  assert.Symbols(symbols);
  return create.Boolean([symbol2, ...symbols].every(b => b[1] === symbol1[1]));
});

const symbolToString = defineBuiltInProcedure("symbol->string", [
  { name: "obj" },
], ({ obj }) => {
  assert.Symbol(obj);
  return create.String(obj[1], true);
});

const stringToSymbol = defineBuiltInProcedure("string->symbol", [
  { name: "obj" },
], ({ obj }) => {
  assert.String(obj);
  return create.Symbol(obj[1]);
});

export const procedures = {
  symbolQ, symbolEQ, symbolToString, stringToSymbol
};
