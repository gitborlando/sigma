// import { Flex } from '@gitborlando/widget'
// import { FC, Fragment } from 'react'
// import { OperateShadow } from 'src/editor/operate/shadow'
// import { iife } from '@gitborlando/utils'
// import { useMatchPatch, useMemoComp } from 'src/shared/utils/react'
// import { IconButton } from 'src/view/ui-utility/widget/button/icon-button'
// import { Divide } from 'src/view/ui-utility/widget/divide'

// type IShadowComp = {}

// export const ShadowComp: FC<IShadowComp> = ({}) => {
//   const { shadows, addShadow, isMultiShadows } = OperateShadow
//   const hasShadows = shadows.length > 0
//   useMatchPatch('/?/shadows/...')

//   const HeaderComp = useMemoComp([hasShadows], ({}) => {
//     return (
//       <Flex layout='h' className={`wh-100%-24 ${hasShadows && 'mb-8'}`}>
//         <Flex layout='c' className='labelFont ml-5'>
//           <h4>阴影</h4>
//         </Flex>
//         <IconButton size={16} style={{ marginLeft: 'auto' }} onClick={addShadow}>
//           {Assets.editor.leftPanel.page.add}
//         </IconButton>
//       </Flex>
//     )
//   })

//   const ShadowListComp = useMemoComp<{ shadows: IShadow[] }>([], ({ shadows }) => {
//     return shadows.map((shadow, index) =>
//       index !== shadows.length - 1 ? (
//         <Fragment key={index}>
//           <ShadowItemComp key={index} shadow={shadow} index={index} />
//           <Divide
//             direction='h'
//             margin={6}
//             length={'95%'}
//             thickness={0.2}
//             bgColor='#E3E3E3'
//           />
//         </Fragment>
//       ) : (
//         <ShadowItemComp key={index} shadow={shadow} index={index} />
//       ),
//     )
//   })

//   const ShadowItemComp = useMemoComp<{
//     shadow: IShadow
//     index: number
//   }>([], ({ shadow, index }) => {
//     const { deleteShadow, setShadow, toggleShadow, afterOperate } = OperateShadow

//     return (
//       <Flex layout='v' className='wh-100%-fit'>
//         <Flex className='wh-100%-28 mb-4'>
//           {/* <PickerOpener fill={shadow.fill} index={index} impact='shadow' /> */}
//           <IconButton
//             size={16}
//             style={{ marginLeft: 'auto' }}
//             onClick={() => toggleShadow(index, ['visible'], !shadow.visible)}>
//             {shadow.visible
//               ? Assets.editor.shared.visible
//               : Assets.editor.shared.unVisible}
//           </IconButton>
//           <IconButton size={16} onClick={() => deleteShadow(index)}>
//             {Assets.editor.shared.minus}
//           </IconButton>
//         </Flex>
//         <Flex className='wh-100%-28'>
//           {iife(() => {
//             const keys = ['offsetX', 'offsetY', 'blur'] as const
//             const labels = ['x偏移', 'y偏移', '模糊']
//             return keys.map(
//               (key, i) => null,
//               // <CompositeInput
//               //   key={key}
//               //   className='wh-92-28 r-2 mr-4 d-hover-bg [&_.label]:w-fit'
//               //   label={labels[i]}
//               //   needStepHandler={false}
//               //   value={shadow[key].toString()}
//               //   onNewValueApply={(value) => setShadow(index, [key], Number(value))}
//               //   afterOperate={() => afterOperate.dispatch()}
//               // />
//             )
//           })}
//         </Flex>
//       </Flex>
//     )
//   })

//   return (
//     <Flex layout='v' className='wh-100%-fit bg-white borderBottom p-8'>
//       <HeaderComp />
//       {!isMultiShadows ? (
//         <ShadowListComp shadows={shadows} />
//       ) : (
//         <Flex layout='c' className='h-24 mt-8 mr-auto labelFont'>
//           点击 + 重置并修改多个描边
//         </Flex>
//       )}
//     </Flex>
//   )
// }
