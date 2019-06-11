import { Readable, Writable } from 'stream'

export class ReadableBuffer extends Readable {
  constructor(buffer: Buffer | string) {
    super({ read: () => {} })

    const content = typeof buffer === 'string' ? Buffer.from(buffer) : buffer

    this.push(content)
    setTimeout(() => this.push(null), 0)
  }
}

export class WritableBuffer extends Writable {
  buff: string[]
  constructor() {
    super()
    this.buff = []
  }

  _write(chunk, encoding, callback) {
    this.buff.push(chunk.toString())
    callback()
  }

  get buffer() {
    return this.buff.join('')
  }
}

export const asyncWrite = (out: Writable) => (data: any) => {
  return new Promise((resolve, reject) => {
    out.write(data, (err) => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
  })
}

export const fromIter = (iter) => (start, sink) => {
  if (start !== 0) return
  const iterator = typeof Symbol !== 'undefined' && iter[Symbol.iterator] ? iter[Symbol.iterator]() : iter
  let inloop = false
  let got1 = false
  let res
  function loop() {
    inloop = true
    while (got1) {
      got1 = false
      res = iterator.next()
      if (res.done) sink(2)
      else sink(1, res.value)
    }
    inloop = false
  }
  sink(0, (t) => {
    if (t === 1) {
      got1 = true
      if (!inloop && !(res && res.done)) loop()
    }
  })
}

export const map = (fn) => (source) => (start, sink) => {
  if (start !== 0) return
  source(0, async (t, d) => {
    const res = await fn(d)
    sink(t, t === 1 ? res : d)
  })
}

export const filter = (fn) => (source) => (start, sink) => {
  if (start !== 0) return

  let talkback
  source(0, async (t, d) => {
    if (t === 0) {
      talkback = d
      sink(t, d)
    } else if (t === 1) {
      if (await fn(d)) sink(t, d)
      else talkback(1)
    } else sink(t, d)
  })
}

export const each = (fn) => (source) => {
  let talkback
  source(0, async (t, d) => {
    if (t === 0) talkback = d
    if (t === 1) await fn(d)
    if (t === 1 || t === 0) talkback(1)
  })
}

export const pipe = (...cbs) => {
  let res = cbs[0]
  for (let i = 1, n = cbs.length; i < n; i++) res = cbs[i](res)
  return res
}

export const skip = (max) => (source) => (start, sink) => {
  if (start !== 0) return
  let skipped = 0
  let talkback
  source(0, (t, d) => {
    if (t === 0) {
      talkback = d
      sink(t, d)
    } else if (t === 1) {
      if (skipped < max) {
        skipped++
        talkback(1)
      } else sink(t, d)
    } else {
      sink(t, d)
    }
  })
}

export const createReadableSource = (readable: Readable) => {
  return (start, sink) => {
    // prevent to register the source again
    if (start !== 0) return

    // pause the system until, sink pulls the data
    readable.pause()

    const onData = (msg) => {
      readable.pause()
      sink(1, msg)
    }

    const onError = (err) => {
      sink(2, err)
    }

    readable.on('data', onData)
    readable.on('error', onError)

    sink(0, (t) => {
      switch (t) {
        case 1:
          readable.resume()
          break
        case 2:
          readable.off('data', onData)
          readable.off('error', onError)
          break
      }
    })
  }
}

export const createWritableSink = (writable: Writable) => {
  return each(asyncWrite(writable))
}

// export const tea = () => {
//   //
// }

// interface Storage {
//   get<T>(key: string): Promise<T>
//   put<T>(key: string, value: T): Promise<void>
//   del(key: string): Promise<void>
// }

// // cb: (data1, data2), source1, source2
// export const merge = (storage: Storage) => (cb, ...sources) => {
//   //
// }
