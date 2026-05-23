import { Plus } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import {
  OpFieldComp,
  OpFieldHeaderComp,
} from 'src/view/editor/right-panel/operate/components/op-field'

export const EditorRPOperateStrokeComp: FC<{}> = ({}) => {
  return (
    <OpFieldComp>
      <OpFieldHeaderComp
        title='描边'
        headerSlot={<Btn icon={<Lucide icon={Plus} />} onClick={() => {}} />}
      />
    </OpFieldComp>
  )
}
