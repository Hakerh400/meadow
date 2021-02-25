'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('omikron');

class Expression{
  entry = null;

  get type(){ O.virtual('type'); }

  get isUnary(){ return 0; }
  get isBinary(){ return 0; }

  get isSymbol(){ return 0; }
  get isStruct(){ return 0; }
  get isCall(){ return 0; }
  get isAlias(){ return 0; }

  eq(other){
    const e1 = this.entry;
    const e2 = other.entry;

    assert(e1 !== null && e2 !== null);

    return e1[0] === e2[0] && e1[1] === e2[1];
  }
}

class Unary extends Expression{
  constructor(name){
    super();
    this.name = name;
  }

  get isUnary(){ return 1; }
}

class Binary extends Expression{
  #fst;
  #snd;

  constructor(fst, snd){
    super();
    this.#fst = fst;
    this.#snd = snd;
  }

  get fst(){
    while(typeof this.#fst === 'function')
      this.#fst = this.#fst();

    return this.#fst;
  }

  get snd(){
    while(typeof this.#snd === 'function')
      this.#snd = this.#snd();

    return this.#snd;
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