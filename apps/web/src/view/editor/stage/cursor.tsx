import { values } from 'mobx'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageViewport } from 'src/editor/stage/viewport'

export const EditorStageCursorsComp: FC<{}> = observer(({}) => {
  const others = YClients.others
  const cursors = values(others).map((other) => ({
    xy: other.cursor,
    name: other.userName,
  }))
  return (
    <>
      {cursors.map((cursor) => (
        <CursorComp x-if={cursor.xy} {...cursor} />
      ))}
    </>
  )
})

const CursorComp: FC<{ xy: IXY; name: string }> = observer(({ xy, name }) => {
  xy = StageViewport.toStageXY(xy)
  const [color] = useState(() => COLOR.random())
  const node = SchemaCreator.rect({
    ...xy,
    width: 10,
    height: 10,
    radius: 5,
    fills: [SchemaCreator.fillColor(color, 1)],
  })
  const text = SchemaCreator.text({
    x: xy.x + 6,
    y: xy.y + 16,
    width: 60,
    height: 12,
    content: name,
    style: {
      fontSize: 12,
      fontWeight: 100,
      align: 'center',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      letterSpacing: 0,
      lineHeight: 16,
    },
    fills: [SchemaCreator.fillColor(color, 1)],
  })

  return (
    <>
      <elem node={node} />
      <elem node={text} />
    </>
  )
})
