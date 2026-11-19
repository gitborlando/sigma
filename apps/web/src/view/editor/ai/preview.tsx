import { useEditorServices } from '../../hooks/use-services'
import { PreviewShape } from './preview-shape'

export const AiPreviewComp = observer(() => {
  const { aiPreview, stageViewport, select } = useEditorServices()
  const scene = aiPreview.scene
  if (!aiPreview.active || !scene) return null
  if (scene.target === 'current' && select.selectPageId !== scene.pageId) return null
  const { width, height, left, top } = stageViewport.bound
  let scale = stageViewport.zoom
  let x = stageViewport.offset.x
  let y = stageViewport.offset.y
  if (scene.target === 'new' && scene.root) {
    const root = scene.root
    scale = Math.min(width / (root.width * 1.15), height / (root.height * 1.15))
    x = (width - root.width * scale) / 2 - root.x * scale
    y = (height - root.height * scale) / 2 - root.y * scale
  }
  return (
    <svg
      style={{ position: 'fixed', left, top, width, height, pointerEvents: 'none' }}>
      {scene.target === 'new' && <rect width='100%' height='100%' fill='#f2f2f2' />}
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        {scene.nodes.map((node, index) => (
          <PreviewShape key={node.id} node={node} index={index} />
        ))}
      </g>
    </svg>
  )
})
