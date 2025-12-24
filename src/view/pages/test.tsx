export const Test = () => {
  useEffect(() => {
    // const xy = { x: 1, y: 2 }
    // for (let i = 0; i < 10; i++) {
    //   recordTime('test', (logTime) => {
    //     for (let i = 0; i < 1000000; i++) {
    //       const a = Angle.cos(90)
    //       const b = Angle.sin(90)
    //     }
    //     logTime('a')
    //   })
    //   recordTime('test', (logTime) => {
    //     for (let i = 0; i < 1000000; i++) {
    //       const cosSin = Angle.cosSin(90)
    //       const a = cosSin.cos
    //       const b = cosSin.sin
    //     }
    //     logTime('b')
    //   })
    //   console.log('--------------------------------\n\n\n')
    // }

    const mrect1 = new MRect(
      100,
      50,
      Matrix.of([
        0.706885036946535, 0.7073284559107571, -0.7071116431172199,
        0.7071019192224456, 35.355582155860986, 0,
      ]).matrix,
    )
    mrect1.transform(Matrix.of([0.5, 0, 0, 1, 0, 0]).matrix)
    console.log(mrect1.width, mrect1.height)
  }, [])
  return <div></div>
}
