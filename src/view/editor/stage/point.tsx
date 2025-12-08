import { Graphics } from '@pixi/react'
import { FC, memo, useState } from 'react'
import { PIXI } from 'src/editor/stage/pixi'
import { Drag } from 'src/global/event/drag'
import { IXY } from 'src/shared/utils/normal'

type IPointComp = {
  select: () => any
  onChangeXY: (shift: IXY) => any
  draw: (opt: { hovered: boolean }) => (g: PIXI.Graphics) => void
  onChangeEnd?: () => any
}

export const PointComp: FC<IPointComp> = memo(
  ({ onChangeXY, select, draw, onChangeEnd }) => {
    const [hovered, setHovered] = useState(false)
    const onMouseDown = () => {
      Drag.onDown(select)
        .onMove(({ shift }) => onChangeXY(shift))
        .onDestroy(({ dragService }) => dragService.started && onChangeEnd?.())
    }

    return (
      <Graphics
        eventMode='dynamic'
        onmouseenter={() => setHovered(true)}
        onmouseleave={() => setHovered(false)}
        onmousedown={onMouseDown}
        draw={draw({ hovered })}
      />
    )
  },
)

PointComp.displayName = 'PointComp'
