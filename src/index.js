'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');
const Database = require('./database');

const {
  SYM,
  FST,
  SND,
  REDUCED_TO,
  REDUCED_FROM,
  REF_FST,
  REF_SND,
  REF_BOTH,

  isSym,
  isPair,
  infoSym,
  infoPair,
} = Database;

const fromObj = objNamesFuncs => {
  const funcNamesArr = O.keys(objNamesFuncs);
  const funcSymsArr = [];
  const funcSymsObj = O.obj();
  const objNamesFuncsNew = O.obj();
  const objNamesSyms = O.obj();
  const objSymsNames = O.obj();
  const objSymsFuncs = O.obj();
  const db = new Database();

  const name2sym = name => {
    if(!O.has(objNamesSyms, name)){
      const sym = Symbol(name);

      objNamesSyms[name] = sym;
      objSymsNames[sym] = name;
    }

    return objNamesSyms[name];
  };

  const sym2name = sym => {
    assert(O.has(objSymsNames, sym));
    return objSymsNames[sym];
  };

  const isFunc = sym => {
    return O.has(funcSymsObj, sym);
  };

  const getArity = sym => {
    return getFunc(sym).length;
  };

  const getFunc = sym => {
    assert(isFunc(sym));
    return objSymsFuncs[sym];
  };

  const reduce = function*(entry){
    const info = db.getInfo(entry);
    const sym = yield [info2sym, info];
    const args = yield [info2args, info];
    const arity = getArity(sym);

    assert(args.length <= arity);

    if(args.length !== arity)
      return entry;

    return O.tco(call, sym, args);
  };

  const call = function*(funcSym, args){
    const func = getFunc(funcSym);
    let arg = null;
  };

  const info2sym = function*(info){
    if(infoSym(info))
      return info[FST];

    return O.tco(info2sym, info[FST]);
  };

  const info2args = function*(info){
    if(infoSym(info))
      return [];

    return [...yield [info2args, info[FST]], info[SND]];
  };

  for(const name of funcNamesArr){
    const sym = name2sym(name);

    objSymsFuncs[sym] = objNamesFuncs[name];
    funcSymsArr.push(sym);
    funcSymsObj[sym] = 1;
  }

  for(const funcSym of funcSymsArr){
    const reduced = O.rec(reduce, db.add(funcSym));
    objNamesFuncsNew[sym2name(funcSym)] = reduced;
  }

  return [db, objNamesFuncsNew];
};

module.exports = {
  Database,

  fromObj,
};