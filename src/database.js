'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');

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
        this.getEntry(a)[6].push(entry);
      }else{
        this.getEntry(a)[4].push(entry);
        this.getEntry(b)[5].push(entry);
      }
    }

    return this.pairs[a][b];
  }

  getEntry(entry){
    assert(entry < this.table.length);
    return this.table[entry];
  }
}

module.exports = Database;