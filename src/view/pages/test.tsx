import { createRegularPolygon } from 'src/editor/math'
import { recordTime } from 'src/utils/misc'

export const Test = () => {
  useEffect(() => {}, [])
  return (
    <div>
      <TimeRecordComp />
    </div>
  )
}

const TimeRecordComp: FC<{}> = observer(({}) => {
  useEffect(() => {
    recordTime(
      'test',
      (logTime, range) => {
        range(100000, () => {
          createRegularPolygon(100, 100, 5)
        })
        logTime('createRegularPolygon')
      },
      10,
    )
    recordTime(
      'test2',
      (logTime, range) => {
        range(100000, () => {})
        logTime('createRegularPolygon2')
      },
      10,
    )
  }, [])
  return <G></G>
})
