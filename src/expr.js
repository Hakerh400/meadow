'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');

class Expression{
  get type(){ O.virtual('type'); }

  get isUnary(){ return 0; }
  get isBinary(){ return 0; }

  get isSymbol(){ return 0; }
  get isStruct(){ return 0; }
  get isCall(){ return 0; }
  get isAlias(){ return 0; }
}

class Unary extends Expression{
  constructor(name){
    super();
    this.name = name;
  }

  get isUnary(){ return 1; }
}

class Binary extends Expression{
  constructor(fst, snd){
    super();
    this.fst = fst;
    this.snd = snd;
  }

  get isBinary(){ return 1; }
}

class Symbol extends Unary{
  get type(){ return 0; }
  get isSymbol(){ return 1; }
}

class Struct extends Binary{
  get type(){ return 1; }
  get isStruct(){ return 1; }
}

class Call extends Binary{
  get type(){ return 2; }
  get isCall(){ return 1; }
}

class Alias extends Unary{
  get type(){ return 3; }
  get isAlias(){ return 1; }
}

module.exports = Object.assign(Expression, {
  Unary,
  Binary,
  Symbol,
  Struct,
  Call,
  Alias,
});