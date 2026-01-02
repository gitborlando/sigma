export const Test = () => {
  useEffect(() => {
    const before = {
      a: 0.7071067811865476,
      b: 0.7071067811865475,
      c: -0.7071067811865475,
      d: 0.7071067811865476,
      tx: 250,
      ty: -103.55339059327378,
    } as IMatrix

    const diff = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 50,
      ty: 0,
    } as IMatrix

    const res = {
      a: 0.7071067811865476,
      b: 0.7071067811865475,
      c: -0.7071067811865475,
      d: 0.7071067811865476,
      tx: 303.5498192558057,
      ty: -36.49303679381269,
    } as IMatrix

    console.log(Matrix.of(before).append(diff).plain())
    // const after = Matrix.of(before).append(Matrix.of(diff)).plain()
    // console.log(after)
  }, [])
  return <div></div>
}
