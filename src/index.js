'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');
const Database = require('./database');
const Expression = require('./expr');

const cs = Expression;

const fromObj = funcs => {
  const funcNames = O.keys(funcs);
  const db = new Database();

  const call = function*(name, args=[]){
    assert(getArity(name) === args.length);

    const func = getFunc(name);
    const gen = func(...args);

    let arg = null;

    while(1){
      const result = gen.next(arg);
      const {value: val, done} = result;

      assert(val.length !== 0);

      if(!done){
        const call = yield [convertToCall, val];
        arg = yield [[db, 'reduce'], call];
        continue;
      }

      return O.tco(convertToStruct, val);
    }
  };

  const extractName = function*(expr){
    if(expr.isSymbol)
      return expr.name;

    assert(expr.isStruct);

    return O.tco(extractName, expr.fst);
  };

  const extractArgs = function*(expr){
    if(expr.isSymbol)
      return [];

    assert(expr.isStruct);

    const args = yield [extractArgs, expr.fst];
    args.push(expr.snd);

    return args;
  };
  
  const convertToStruct = function*(expr){
    return O.tco(convertToCtor, expr, cs.Struct);
  };

  const convertToCall = function*(expr){
    return O.tco(convertToCtor, expr, cs.Call);
  };

  const convertToCtor = function*(expr, ctor, index=null){
    if(expr instanceof Expression)
      return expr;

    if(typeof expr === 'string')
      return nameToExpr(expr);

    assert(Array.isArray(expr));
    assert(expr.length !== 0);

    if(index === null)
      index = expr.length - 1;

    if(index === 0)
      return O.tco(convertToStruct, expr[0]);

    const fst = yield [convertToCtor, expr, ctor, index - 1];
    const snd = yield [convertToStruct, expr[index]];

    return new ctor(fst, snd);
  };

  const getFuncId = name => {
    return isNullary(name) ? new cs.Alias(name) : new cs.Symbol(name);
  };

  const getArity = name => {
    return getFunc(name).length;
  };

  const isNullary = name => {
    return getArity(name) === 0;
  };

  const hasFunc = name => {
    return O.has(funcs, name);
  };

  const getFunc = name => {
    if(!hasFunc(name))
      throw new TypeError(`Undefined function ${O.sf(name)}`);

    return funcs[name];
  };

  const nameToExpr = name => {
    if(hasFunc(name)) return getFuncId(name);
    return new cs.Symbol(name);
  };

  db.setHandler(function*(expr){
    if(expr.isAlias)
      return O.tco(call, expr.name);
    
    assert(expr.isCall);

    const {fst, snd} = expr;
    const name = yield [extractName, fst];

    const arity = getArity(name);
    const args = yield [extractArgs, fst];
    args.push(snd);

    const argsNum = args.length;

    if(argsNum < arity)
      return new cs.Struct(fst, snd);

    assert(argsNum === arity);

    return O.tco(call, name, args);
  });

  const objNew = O.obj();

  for(const name of funcNames)
    objNew[name] = O.rec([db, 'reduce'], getFuncId(name));

  return [db, objNew];
};

module.exports = {
  Database,
  Expression,

  fromObj,
};