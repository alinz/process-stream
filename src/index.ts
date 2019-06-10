import { Readable, Writable } from 'stream'

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

export const map = (fn) => (source) => (start, sink) => {
  if (start !== 0) return
  source(0, async (t, d) => {
    const res = await fn(d)
    sink(t, t === 1 ? res : d)
  })
}

export const filter = (fn) => (source) => (start, sink) => {
  if (start !== 0) return
  source(0, async (t, d) => {
    const res = await fn(d)
    sink(t, t === 1 ? res : d)
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

    readable.on('data', onData)

    sink(0, (t) => {
      switch (t) {
        case 1:
          readable.resume()
          break
        case 2:
          readable.off('data', onData)
          break
      }
    })
  }
}

export const createWritableSink = (writable: Writable) => {
  return each(asyncWrite(writable))
}
