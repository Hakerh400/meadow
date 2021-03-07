'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');

const SYM = 0;
const FST = 0;
const SND = 1;
const REDUCED_TO = 2;
const REDUCED_FROM = 3
const REF_FST = 4
const REF_SND = 5
const REF_BOTH = 6

class Database{
  table = [];

  syms = O.obj();
  pairs = O.obj();

  hasSym(sym){
    return O.has(this.syms, sym);
  }

  addSym(sym){
    if(!this.hasSym(sym)){
      this.syms[sym] = this.table.length;
      this.table.push([sym, null, null, [], [], [], []]);
    }

    return this.syms[sym];
  }

  hasPair(a, b){
    return O.has(this.pairs, a) && O.has(this.pairs[a], b);
  }

  addPair(a, b){
    if(!this.hasPair(a, b)){
      if(!O.has(this.pairs, a))
        this.pairs[a] = O.obj();

      const entry = this.table.length;

      this.pairs[a][b] = entry;
      this.table.push([a, b, null, [], [], [], []]);

      if(a === b){
        this.getInfo(a)[REF_BOTH].push(entry);
      }else{
        this.getInfo(a)[REF_FST].push(entry);
        this.getInfo(b)[REF_SND].push(entry);
      }
    }

    return this.pairs[a][b];
  }

  add(expr){
    if(isSym(expr))
      return this.addSym(expr);

    return this.addPair(expr);
  }

  getInfo(entry){
    assert(entry < this.table.length);
    return this.table[entry];
  }

  reduce(fromEntry, toEntry){
    const from = getInfo(fromEntry);
    const to = getInfo(toEntry);

    assert(from[REDUCED_TO] === null);

    from[REDUCED_TO] = toEntry;
    to[REDUCED_FROM].push(fromEntry);

    return toEntry;
  }
}

const isSym = expr => {
  return typeof expr === 'symbol';
};

const isPair = expr => {
  return typeof expr === 'object';
};

const infoSym = info => {
  return info[SND] === null;
};

const infoPair = info => {
  return info[SND] !== null;
};

module.exports = Object.assign(Database, {
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
});