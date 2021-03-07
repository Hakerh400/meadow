'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');
const Database = require('./database');

const fromObj = funcs => {
  const funcNames = O.keys(funcs);
  const db = new Database();
  const syms = O.obj();

  const name2sym = name => {
    if(!O.has(syms, name)){
      const sym = Symbol(name);

      syms[name] = sym;
      syms[sym] = name;
    }

    return syms[name];
  };

  const getTypeSym = function*(expr){
    if(isSym(expr))
      return expr;

    return O.tco(getTypeSym, expr[0]);
  };

  const getArgs = function*(expr){
    if(isSym(expr))
      return [];

    return [...yield [getArgs, expr[0]], expr[1]];
  };

  const reduce = function*(expr){
    const name = yield [getTypeSym, expr];
    assert(isFunc(name));

    const arity = getArity(name);
    const args = yield [getArgs, expr];
    assert(args.length <= arity);

    if(args.length !== arity)
      return O.tco(insert, expr);

    return O.tco(call, name, args);
  };

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
        arg = yield [reduce, call];
        continue;
      }

      return O.tco(convertToStruct, val);
    }
  };

  const isFunc = sym => {
    return O.has(funcs, sym.description);
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

  const toStruct = function*(a, b){
    return [a, b];
  };

  const toCall = function*(a, b){
    return O.tco(reduce, [a, b]);
  };
  
  const convertToStruct = function*(expr){
    return O.tco(convertToCtor, expr, toStruct);
  };

  const convertToCall = function*(expr){
    return O.tco(convertToCtor, expr, toCall);
  };

  const convertToCtor = function*(expr, func, index=null){
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

    const fst = yield [convertToCtor, expr, func, index - 1];
    const snd = yield [convertToStruct, expr[index]];

    return O.tco(func, fst, snd);
  };

  const getFuncId = name => {
    return name2sym(name);
  };

  const getArity = name => {
    return getFunc(name).length;
  };

  const isNullary = name => {
    return getArity(name) === 0;
  };

  const hasFunc = name => {
    return O.has(funcs, syms[name]);
  };

  const getFunc = name => {
    if(!hasFunc(name))
      throw new TypeError(`Undefined function ${O.sf(name)}`);

    return funcs[syms[name]];
  };

  const nameToExpr = name => {
    if(hasFunc(name)) return getFuncId(name);
    return new cs.Symbol(name);
  };

  const handler = function*(expr){
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
  };

  const objNew = O.obj();

  for(const name of funcNames)
    objNew[name] = O.rec(reduce, getFuncId(name));

  return [db, objNew];
};

const isSym = expr => {
  return typeof expr === 'symbol';
};

const isPair = expr => {
  return typeof expr === 'object';
};

module.exports = {
  Database,

  fromObj,

  isSym,
  isPair,
};