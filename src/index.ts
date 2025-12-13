// import { enablePatches } from 'immer'
// import { configure } from 'mobx'
// import { createElement } from 'react'
// import ReactDOM from 'react-dom/client'
// import { App } from './view/app'

import { MATRIX } from 'src/editor/math'
import { Matrix_O } from 'src/editor/math/matrix_O'
import { recordTime } from 'src/utils/misc'

// enablePatches()
// configure({ enforceActions: 'never' })

// ReactDOM.createRoot(document.getElementById('root')!).render(createElement(App))

for (let i = 0; i < 5; i++) {
  recordTime('1', (logTime) => {
    const matrix = Matrix.identity()
    for (let i = 0; i < 1000000; i++) {
      Matrix_O.fromTuple(matrix).rotate(30).translate(1, 1).tuple()
      Matrix_O.fromTuple(matrix).rotate(30).translate(1, 1).tuple()
      Matrix_O.fromTuple(matrix).rotate(30).translate(1, 1).tuple()
      Matrix_O.fromTuple(matrix).rotate(30).translate(1, 1).tuple()
      Matrix_O.fromTuple(matrix).rotate(30).translate(1, 1).tuple()
    }
    logTime('1')
  })

  recordTime('2', (logTime) => {
    const matrix = Matrix.identity()
    for (let i = 0; i < 1000000; i++) {
      MATRIX(matrix).rotate(30).translate(1, 1).matrix
      MATRIX(matrix).rotate(30).translate(1, 1).matrix
      MATRIX(matrix).rotate(30).translate(1, 1).matrix
      MATRIX(matrix).rotate(30).translate(1, 1).matrix
      MATRIX(matrix).rotate(30).translate(1, 1).matrix
    }
    logTime('2')
  })

  console.log('\n\n--------------------------\n\n')
}
