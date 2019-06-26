import { Readable, Writable } from 'stream'

import { createReadableSource, createWritableSink, pipe, map, filter, each, range } from './helpers'

export interface Pipe<Value> {
  map<NewValue>(fn: (val: Value) => Promise<NewValue>): Pipe<NewValue>
  filter(fn: (val: Value) => Promise<boolean>): Pipe<Value>
  pipe<T>(src: Pipe<T>): Pipe<T>
  forEach(fn: (val: Value) => Promise<void>): void
}

export interface Source<Value> extends Pipe<Value> {}

export interface Sink<Value> extends Pipe<Value> {
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

  forEach(fn: (val: T) => Promise<void>): void {
    pipe(
      this.chain,
      each(fn),
    )
  }
}

class SourceImpl<T> extends PipeImpl<T> {
  constructor(src: any) {
    super(src)
  }
}

class SinkImpl<T> extends PipeImpl<T> {
  sink: any
  constructor(sink: any) {
    super()
    this.sink = sink
  }

  forEach(fn: (val: T) => Promise<void>): void {
    throw new Error('Sink does not have forEach')
  }

  drain(): void {
    pipe(
      this.chain,
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
