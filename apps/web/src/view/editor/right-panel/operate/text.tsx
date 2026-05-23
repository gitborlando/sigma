import { iife } from '@gitborlando/utils'
import { Flex } from '@gitborlando/widget'
import { FC, useRef } from 'react'
import { ITextStyleKey, OperateText } from 'src/editor/operate/text'
import { Schema } from 'src/editor/schema/schema'
import { StageViewport } from 'src/editor/stage/viewport'
import { useMatchPatch, useMemoComp } from 'src/shared/utils/react'
import { useHookSignal } from 'src/utils/signal-react'
import { DraggableComp } from 'src/view/component/drag-panel'

export const TextComp: FC<{}> = ({}) => {
  const {
    intoEditing,
    textStyle,
    textStyleOptions,
    setTextStyle,
    toggleTextStyle,
    afterOperate,
  } = OperateText
  const createDownUpTracker = (
    elFunc: () => HTMLElement | null,
    key: ITextStyleKey,
  ) => {
    // useDownUpTracker(elFunc, () => {}, afterOperate.dispatch)
  }

  useHookSignal(intoEditing)
  useMatchPatch('/?/content')
  useMatchPatch('/?/style/...')

  const HeaderComp = useMemoComp([], ({}) => {
    return (
      <Flex layout='h' className='wh-100%-24 mb-8'>
        <Flex layout='c' className='labelFont ml-5'>
          <h4>文本</h4>
        </Flex>
      </Flex>
    )
  })

  const TextEditComp = useMemoComp([], ({}) => {
    const { setTextContent } = OperateText
    const textNode = Schema.find<IText>(intoEditing.value)
    const xy = iife(() => {
      const { x, y, width } = textNode
      return StageViewport.sceneXYToClientXY({ x: x + width, y })
    })
    useMatchPatch(`/${textNode.id}/content`)

    return (
      <DraggableComp
        xy={xy}
        headerSlot={<h6>编辑文本</h6>}
        clickAwayClose={() => !!intoEditing.value}
        closeFunc={() => {
          intoEditing.dispatch('')
          afterOperate.dispatch()
        }}>
        <Flex layout='v' className='wh-100%-200'>
          <textarea
            className='wh-100%-200 font-size-14 p-4 resize-none outline-none border-none'
            value={textNode.content}
            onChange={(e) => setTextContent(textNode, e.target.value)}></textarea>
        </Flex>
      </DraggableComp>
    )
  })

  const { fontSize, fontWeight } = textStyle
  const FontSizeWeightComp = useMemoComp([fontSize, fontWeight], ({}) => {
    const inputRef = useRef<HTMLDivElement>(null)
    createDownUpTracker(() => inputRef.current, 'fontSize')
    return (
      <Flex layout='h' className='w-100% mb-4'>
        {/* <CompositeInput
          className='mr-4'
          ref={inputRef}
          label='大小'
          value={fontSize.toString()}
          onNewValueApply={(value) => setTextStyle('fontSize', Number(value))}
          afterOperate={() => afterOperate.dispatch()}
        /> */}
        {/* <Dropdown
          className='w-69' //@ts-ignore
          selected={fontWeight}
          options={textStyleOptions.fontWeight}
          onSelected={(value) => toggleTextStyle('fontWeight', value)}
        /> */}
      </Flex>
    )
  })

  const { align, lineHeight, letterSpacing } = textStyle
  const FontAlignLineHeightLetterSpacingComp = useMemoComp(
    [align, lineHeight, letterSpacing],
    ({}) => {
      return (
        <Flex layout='h' className='w-100%'>
          <Dropdown
            className='w-80'
            selected={align}
            options={textStyleOptions.align} //@ts-ignore
            isMulti={align === 'multi'}
            translateArray={['左对齐', '居中对齐', '右对齐']}
            onSelected={(value) => toggleTextStyle('align', value)}
          />
          {/* <CompositeInput
            className='w-74'
            label='行高'
            value={lineHeight.toString()}
            onNewValueApply={(value) => setTextStyle('lineHeight', Number(value))}
            afterOperate={() => afterOperate.dispatch()}
          />
          <CompositeInput
            className='w-74'
            label='字间距'
            value={letterSpacing.toString()}
            onNewValueApply={(value) => setTextStyle('letterSpacing', Number(value))}
            afterOperate={() => afterOperate.dispatch()}
          /> */}
        </Flex>
      )
    },
  )

  return (
    <Flex layout='v' className='wh-100%-fit bg-white borderBottom p-8'>
      <HeaderComp />
      {intoEditing.value && <TextEditComp />}
      <FontSizeWeightComp />
      <FontAlignLineHeightLetterSpacingComp />
    </Flex>
  )
}
