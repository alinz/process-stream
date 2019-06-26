import { Readable, Writable } from 'stream'

import { createReadableSource, createWritableSink, pipe, map, filter, each, range } from './helpers'

export interface Pipe<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Pipe<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Pipe<Value>
  pipe<T>(src: Pipe<T>): Pipe<T>
}

export interface Source<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Source<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Source<Value>
  pipe<T>(src: Pipe<T>): Source<T>
  forEach(fn: (val: Value) => Promise<void>): void
}

export interface Sink<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Sink<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Sink<Value>
  pipe<T>(src: Pipe<T>): Sink<T>
  drain(): void
}

const addToChain = (chain, fn) => {
  if (chain) {
    return pipe(
      chain,
      fn,
    )
  }
  return fn
}

class PipeImpl<T> implements Pipe<T> {
  chain: any

  constructor(src: any = undefined) {
    this.chain = src
  }

  map<NewT>(fn: (val: T) => Promise<NewT>): Pipe<NewT> {
    this.chain = addToChain(this.chain, map(fn))
    return this as any
  }

  filter(fn: (val: T) => Promise<boolean>): Pipe<T> {
    this.chain = addToChain(this.chain, filter(fn))
    return this
  }

  pipe<NewT>(src: Pipe<NewT>): Pipe<NewT> {
    const p = src as PipeImpl<NewT>
    this.chain = addToChain(this.chain, p.chain)
    return this as any
  }
}

class SourceImpl<T> {
  p: PipeImpl<T>

  constructor(src: any) {
    this.p = new PipeImpl<T>(src)
  }

  map<NewT>(fn: (val: T) => Promise<NewT>): Source<NewT> {
    this.p.chain = addToChain(this.p.chain, map(fn))
    return this as any
  }

  filter(fn: (val: T) => Promise<boolean>): Source<T> {
    this.p.chain = addToChain(this.p.chain, filter(fn))
    return this as any
  }

  pipe<NewT>(src: Pipe<NewT>): Source<NewT> {
    const p = src as PipeImpl<NewT>
    this.p.chain = addToChain(this.p.chain, p.chain)
    return this as any
  }

  forEach(fn: (val: T) => Promise<void>): void {
    pipe(
      this.p.chain,
      each(fn),
    )
  }
}

class SinkImpl<T> {
  p: PipeImpl<T>
  sink: any

  constructor(sink: any) {
    this.p = new PipeImpl<T>()
    this.sink = sink
  }

  map<NewT>(fn: (val: T) => Promise<NewT>): Sink<NewT> {
    this.p.chain = addToChain(this.p.chain, map(fn))
    return this as any
  }

  filter(fn: (val: T) => Promise<boolean>): Sink<T> {
    this.p.chain = addToChain(this.p.chain, filter(fn))
    return this as any
  }

  pipe<NewT>(src: Pipe<NewT>): Sink<NewT> {
    const p = src as PipeImpl<NewT>
    this.p.chain = addToChain(this.p.chain, p.chain)
    return this as any
  }

  drain(): void {
    pipe(
      this.p.chain,
      this.sink,
    )
  }
}

export const createPipe = <T>(): Pipe<T> => {
  return new PipeImpl<T>()
}

export const createSource = <T>(stream: Readable): Source<T> => {
  return new SourceImpl<T>(createReadableSource(stream))
}

export const createSink = <T>(stream: Writable): Sink<T> => {
  return new SinkImpl<T>(createWritableSink(stream))
}

export const createSourceRange = (from: number, to: number, skip: number = 1): Source<number> => {
  return new SourceImpl<number>(range(from, to, skip))
}
