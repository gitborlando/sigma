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

    const matrix = Matrix.of([
      0.44698926940981387, 0.8945393188856938, -0.4472185154583238,
      0.8944247310038184, 73.66116647266891, -2.0028305549516574,
    ]).matrix

    console.log(Matrix.of(matrix).xy(XY.$(109, 26)))

    const mrect = new MRect(
      100,
      50,
      Matrix.of([
        0.44698926940981387, 0.8945393188856938, -0.4472185154583238,
        0.8944247310038184, 73.66116647266891, -2.0028305549516574,
      ]).matrix,
    )
    console.log(mrect.globalSize)
  }, [])
  return <div></div>
}
