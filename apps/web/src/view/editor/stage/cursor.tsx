import { values } from 'mobx'
import { COLOR } from 'src/utils/color'
import { useEditorService } from 'src/view/hooks/editor'

export const EditorStageCursorsComp: FC<{}> = observer(({}) => {
  const yAware = useEditorService('yAware')
  const others = yAware.others
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
  const schemaCreator = useEditorService('schemaCreator')
  const stageViewport = useEditorService('stageViewport')

  xy = stageViewport.toStageXY(xy)
  const [color] = useState(() => COLOR.random())
  const node = schemaCreator.rect({
    ...xy,
    width: 10,
    height: 10,
    radius: 5,
    fills: [schemaCreator.fillColor(color, 1)],
  })
  const text = schemaCreator.text({
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
    fills: [schemaCreator.fillColor(color, 1)],
  })

  return (
    <>
      <elem node={node} />
      <elem node={text} />
    </>
  )
})
