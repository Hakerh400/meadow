'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');
const debug = require('../../JavaScript/debug');
const Expression = require('./expr');

const cs = Expression;

class Database{
  symbols = O.obj();
  structs = new O.MultidimensionalMap();
  calls = new O.MultidimensionalMap();
  aliases = O.obj();

  entries = new O.MultidimensionalMap();
  entriesCnt = O.ca(4, () => 0);

  handler = null;

  setHandler(handler){
    this.handler = handler;
  }

  *insert(expr, reason){
    const {
      symbols,
      structs,
      calls,
      aliases,
      entries,
      handler,
    } = this;

    const newEntry = () => {
      return this.newEntry(expr.type);
    };

    const check = entry => {
      const result = entry[0];

      if(result === null)
        throw new TypeError(`Circular definition for ${O.sf(entry)}`);

      return result;
    };

    const callHandler = function*(expr){
      return O.tco(handler, yield [expandExpr, expr]);
    };

    const expandExpr = function*(expr){
      if(Array.isArray(expr)){
        const info = expr;
        const type = info[0];
        const entry = entries.get(info);
        const details = entry[1];

        if(type === 0)
          return new cs.Symbol(details);

        if(type === 3)
          return new cs.Alias(details);

        const fst = yield [expandExpr, details[0]];
        const snd = yield [expandExpr, details[1]];

        if(type === 1)
          return new cs.Struct(fst, snd);

        if(type === 2)
          return new cs.Call(fst, snd);

        assert.fail();
      }

      if(expr.isUnary)
        return expr;

      const fst = yield [expandExpr, expr.fst];
      const snd = yield [expandExpr, expr.snd];

      return new expr.constructor(fst, snd);
    }

    if(expr.name === 'Zero')
      debugger;

    if(expr.isUnary){
      const {name} = expr;

      if(expr.isSymbol){
        if(O.has(symbols, name))
          return check(symbols[name]);

        const entry = newEntry();
        const info = [null, name, reason];

        entries.set(entry, info);
        symbols[name] = info;

        return info[0] = entry;
      }

      if(expr.isAlias){
        if(O.has(aliases, name))
          return check(aliases[name]);

        const entry = newEntry();
        const info = [null, name, reason];

        entries.set(entry, info);
        aliases[name] = info;

        return info[0] = yield [[this, 'insert'], yield [callHandler, expr], entry];
      }

      assert.fail();
    }

    if(expr.isBinary){
      const fst = yield [[this, 'insert'], expr.fst, [...reason, 0]];
      const snd = yield [[this, 'insert'], expr.snd, [...reason, 1]];
      const pthInfo = [fst, snd];
      const pth = [...fst, ...snd];

      if(expr.isStruct){
        if(structs.has(pth))
          return structs.get(pth);

        const entry = newEntry();
        const info = [null, pthInfo, reason];

        entries.set(entry, info);
        structs.set(pth, info);

        return info[0] = entry;
      }

      if(expr.isCall){
        if(calls.has(pth))
          return calls.get(pth);

        const entry = newEntry();
        const info = [null, pthInfo, reason];

        entries.set(entry, info);
        calls.set(pth, info);

        const exprNew = new cs.Call(fst, snd);

        return info[0] = yield [[this, 'insert'], yield [callHandler, exprNew], entry];
      }

      assert.fail();
    }

    assert.fail();
  }

  newEntry(type){
    return [type, this.entriesCnt[type]++];
  }
}

module.exports = Database;