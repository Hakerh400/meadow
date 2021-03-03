'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');
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

    const db = this;

    const newEntry = () => {
      return this.newEntry(expr.type);
    };

    const callHandler = function*(entry){
      return O.tco(handler, db.entry2expr(entry));
    };

    const checkRet = result => {
      assert(result.length === 2);
      assert(typeof result[0] === 'number');
      assert(typeof result[1] === 'number');

      return result;
    };

    const check = entry => {
      const result = entry[0];

      if(result === null)
        throw new TypeError(`Circular definition for ${O.sf(entry[1])}`);

      return checkRet(result);
    };

    const ret = (info, result) => {
      return checkRet(info[0] = result);
    };

    if(expr.isUnary){
      const {name} = expr;

      if(expr.isSymbol){
        if(O.has(symbols, name))
          return check(symbols[name]);

        const entry = newEntry();
        const info = [null, name, reason];

        entries.set(entry, info);
        symbols[name] = info;

        return ret(info, entry);
      }

      if(expr.isAlias){
        if(O.has(aliases, name))
          return check(aliases[name]);

        const entry = newEntry();
        const info = [null, name, reason];

        entries.set(entry, info);
        aliases[name] = info;

        return ret(info, yield [[this, 'insert'], yield [callHandler, entry], entry]);
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
          return check(structs.get(pth));

        const entry = newEntry();
        const info = [null, pthInfo, reason];

        entries.set(entry, info);
        structs.set(pth, info);

        return ret(info, entry);
      }

      if(expr.isCall){
        if(calls.has(pth))
          return check(calls.get(pth));

        const entry = newEntry();
        const info = [null, pthInfo, reason];

        entries.set(entry, info);
        calls.set(pth, info);

        return ret(info, yield [[this, 'insert'], yield [callHandler, entry], entry]);
      }

      assert.fail();
    }

    assert.fail();
  }

  *reduce(expr, reason){
    const entry = yield [[this, 'insert'], expr, reason];
    return this.entry2expr(entry);
  }

  entry2expr(entry){
    const info = this.entries.get(entry);
    const type = entry[0];
    const details = info[1];

    let expr = null;

    getExpr: {
      if(type === 0){
        expr = new cs.Symbol(details);
        break getExpr;
      }

      if(type === 3){
        expr = new cs.Alias(details);
        break getExpr;
      }

      const fst = () => this.entry2expr(details[0]);
      const snd = () => this.entry2expr(details[1]);

      if(type === 1){
        expr = new cs.Struct(fst, snd);
        break getExpr;
      }

      if(type === 2){
        expr = new cs.Call(fst, snd);
        break getExpr;
      }

      assert.fail();
    }

    expr.entry = entry;

    return expr;
  }

  newEntry(type){
    return [type, this.entriesCnt[type]++];
  }
}

module.exports = Database;