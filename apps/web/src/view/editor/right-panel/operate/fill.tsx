import { Minus, Plus } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import {
  OpFieldComp,
  OpFieldContentComp,
  OpFieldHeaderComp,
} from 'src/view/editor/right-panel/operate/components/op-field'
import { EditorRPOperateFillItemComp } from 'src/view/editor/right-panel/operate/fill-item'
import { useEditorServices } from 'src/view/hooks/editor'

export const EditorRPOperateFillComp: FC<{}> = observer(({}) => {
  const { operateFill } = useEditorServices()
  const { fills, isMultiFills, setFills, newFill } = operateFill
  const addFill = () => {
    setFills((draft) => {
      draft.push(newFill())
    })
  }

  const deleteFill = (index: number) => {
    setFills((draft) => {
      draft.splice(index, 1)
    })
  }

  return (
    <OpFieldComp>
      <OpFieldHeaderComp
        title={t('fill')}
        headerSlot={
          <Btn size={30} icon={<Lucide icon={Plus} />} onClick={addFill} />
        }
      />
      <OpFieldContentComp x-if={fills.length > 0}>
        {fills.map((fill, index) => (
          <G horizontal='1fr auto' center gap={8} key={index}>
            <EditorRPOperateFillItemComp fill={fill} index={index} />
            <Btn
              size={30}
              icon={<Lucide icon={Minus} />}
              onClick={() => deleteFill(index)}
            />
          </G>
        ))}
      </OpFieldContentComp>
    </OpFieldComp>
  )
})
