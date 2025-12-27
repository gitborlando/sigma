import { recordTime } from 'src/utils/misc'

export const Test = () => {
  const times = 40
  useEffect(() => {
    recordTime(
      'test',
      (logTime, range) => {
        const arr = ['a', 'b', 'c', 'd', 'e']
        range(1000000, () => {
          arr.includes('j')
        })
        logTime('a')
      },
      times,
    )
    recordTime(
      'test',
      (logTime, range) => {
        const set = new Set(['a', 'b', 'c', 'd', 'e'])
        range(1000000, () => {
          set.has('j')
        })
        logTime('a')
      },
      times,
    )
    recordTime(
      'test',
      (logTime, range) => {
        const func = macroMatch(['a', 'b', 'c', 'd', 'e'])
        range(1000000, () => {
          func('j')
        })
        logTime('b')
      },
      times,
    )
    recordTime(
      'test',
      (logTime, range) => {
        const a = 'j'
        range(1000000, () => {
          if ('a' === a || 'b' === a || 'c' === a || 'd' === a || 'e' === a) {
          }
        })
        logTime('b')
      },
      times,
    )
  }, [])
  return <div></div>
}

function macroMatch<T extends string | number>(arr: T[]): (a: T) => boolean {
  const functionBody = arr
    .map((item) => `(${JSON.stringify(item)} === a)`)
    .join('||')
  return new Function('a', `return ${functionBody};`) as (a: T) => boolean
}
