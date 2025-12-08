export const Test = () => {
  useEffect(() => {
    const before = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 200,
      ty: 0,
    } as IMatrix

    const after = {
      a: 2,
      b: 0,
      c: 0,
      d: 2,
      tx: 200,
      ty: 0,
    } as IMatrix

    const diff = Matrix.of(after).divide(Matrix.of(before)).plain()
    console.log(diff)
  }, [])
  return <div></div>
}
