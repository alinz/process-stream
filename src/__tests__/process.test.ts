import { ReadableBuffer, WritableBuffer, createReadableSource, createWritableSink, pipe, each, map, fromIter, filter } from '~/src/helpers'
import { createSourceRange, createPipe } from '~/src/stream'
import { eventNames } from 'cluster'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

describe('how stream works', () => {
  test('simple source steram', async (done) => {
    const inputBuffer = new ReadableBuffer('Hello World')

    pipe(
      createReadableSource(inputBuffer),
      each(async (msg) => {
        expect(msg.toString()).toBe('Hello World')
        done()
      }),
    )
  })

  test('simple filtering', async (done) => {
    const expected = [2, 4, 6, 8]
    let count = 0
    pipe(
      fromIter([1, 2, 3, 4, 5, 6, 7, 8]),
      filter((val) => val % 2 === 0),
      each((val) => {
        expect(expected).toContainEqual(val)
        count++

        if (count === expected.length) {
          done()
        }
      }),
    )
  })

  test('combination', async (done) => {
    let count = 0
    pipe(
      fromIter([1, 2, 3, 4, 5, 6]),
      map(async (val) => {
        return val + 10
      }),
      filter((val) => {
        return val % 3 === 0
      }),
      each(async (msg) => {
        count++

        console.log(msg)

        if (count == 2) {
          done()
        }
      }),
    )
  })
})

describe('testing streams', () => {
  test('test createSourceRange pipe', async (done) => {
    const s = createSourceRange(1, 10)
    s.forEach(async (n) => {
      if (n === 10) {
        done()
      }
    })
  })

  test('test createSourceRange along with segmented pipe pipe', async (done) => {
    const evenNumber = createPipe<number>()
    evenNumber.filter(async (n) => {
      return n % 2 === 0
    })

    const s = createSourceRange(1, 10000)

    s.pipe(evenNumber).forEach(async (n) => {
      if (n === 10000) {
        done()
      }
    })
  })
})
