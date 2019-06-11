import { ReadableBuffer, WritableBuffer, createReadableSource, createWritableSink, pipe, each, map, fromIter, filter } from '~/src/index'

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
})
