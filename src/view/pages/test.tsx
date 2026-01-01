import { IMatrixTuple } from 'src/editor/math'

export const Test = () => {
  useEffect(() => {
    const before = [
      0.7071067811865476, 0.7071067811865475, -0.7071067811865475,
      0.7071067811865476, 27.071067811865476, -2,
    ] as IMatrixTuple
    const after = [
      0.447213595499958, 0.8944271909999159, -0.4472135954999578, 0.8944271909999159,
      18.535533905932738, -2,
    ] as IMatrixTuple
    const middle = Matrix.from([0.5, 0, 0, 1, 10, 2]).divide(
      Matrix.from([1, 0, 0, 1, 10, 2]),
    )
    console.log(middle.plain())
    const mrect = new MRect(10, 10, Matrix.from(before))
    mrect.transform(Matrix.from([0.5, 0, 0, 1, 5, 0]))
    console.log(mrect.matrix, mrect.x, mrect.y)
  }, [])
  return <div></div>
}
