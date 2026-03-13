// 自动生成的静态资源路径常量
import editorCursorResize from './editor/cursor/resize.svg'
import editorCursorSelect from './editor/cursor/select.svg'
import editorHeaderStageOperateMove from './editor/header/stage-operate/move.svg'
import editorHeaderStageOperateSelect from './editor/header/stage-operate/select.svg'
import editorNodeEllipse from './editor/node/ellipse.svg'
import editorNodeFrame from './editor/node/frame.svg'
import editorNodeImage from './editor/node/image.svg'
import editorNodeLine from './editor/node/line.svg'
import editorNodePolygon from './editor/node/polygon.svg'
import editorNodeRect from './editor/node/rect.svg'
import editorNodeStar from './editor/node/star.svg'
import editorNodeText from './editor/node/text.svg'
import editorRpOperateAlignAlignCenter from './editor/RP/operate/align/align-center.svg'
import editorRpOperateAlignAlignLeft from './editor/RP/operate/align/align-left.svg'
import editorRpOperateAlignAlignRight from './editor/RP/operate/align/align-right.svg'
import editorRpOperateAlignVerticalBottom from './editor/RP/operate/align/vertical-bottom.svg'
import editorRpOperateAlignVerticalCenter from './editor/RP/operate/align/vertical-center.svg'
import editorRpOperateAlignVerticalTop from './editor/RP/operate/align/vertical-top.svg'
import editorRpOperateFillNone from './editor/RP/operate/fill/none.png'
import editorRpOperateGeoH from './editor/RP/operate/geo/h.svg'
import editorRpOperateGeoRadius from './editor/RP/operate/geo/radius.svg'
import editorRpOperateGeoRotate from './editor/RP/operate/geo/rotate.svg'
import editorRpOperateGeoW from './editor/RP/operate/geo/w.svg'
import editorRpOperateGeoX from './editor/RP/operate/geo/x.svg'
import editorRpOperateGeoY from './editor/RP/operate/geo/y.svg'
import editorRpOperatePickerDefaultImage from './editor/RP/operate/picker/default-image.png'
import favIconShiyangyang from './fav-icon/shiyangyang.png'
import favIconSigma2 from './fav-icon/sigma-2.svg'
import favIconSigma4 from './fav-icon/sigma-4.svg'
import favIconSigmaLogoText from './fav-icon/sigma-logo-text.svg'
import favIconSigma from './fav-icon/sigma.svg'

export const Assets = {
  editor: {
    cursor: {
      resize: editorCursorResize,
      select: editorCursorSelect,
    },
    header: {
      stageOperate: {
        move: editorHeaderStageOperateMove,
        select: editorHeaderStageOperateSelect,
      },
    },
    node: {
      ellipse: editorNodeEllipse,
      frame: editorNodeFrame,
      image: editorNodeImage,
      line: editorNodeLine,
      polygon: editorNodePolygon,
      rect: editorNodeRect,
      star: editorNodeStar,
      text: editorNodeText,
    },
    RP: {
      operate: {
        align: {
          alignCenter: editorRpOperateAlignAlignCenter,
          alignLeft: editorRpOperateAlignAlignLeft,
          alignRight: editorRpOperateAlignAlignRight,
          verticalBottom: editorRpOperateAlignVerticalBottom,
          verticalCenter: editorRpOperateAlignVerticalCenter,
          verticalTop: editorRpOperateAlignVerticalTop,
        },
        fill: {
          none: editorRpOperateFillNone,
        },
        geo: {
          h: editorRpOperateGeoH,
          radius: editorRpOperateGeoRadius,
          rotate: editorRpOperateGeoRotate,
          w: editorRpOperateGeoW,
          x: editorRpOperateGeoX,
          y: editorRpOperateGeoY,
        },
        picker: {
          defaultImage: editorRpOperatePickerDefaultImage,
        },
      },
    },
  },
  favIcon: {
    shiyangyang: favIconShiyangyang,
    sigma2: favIconSigma2,
    sigma4: favIconSigma4,
    sigmaLogoText: favIconSigmaLogoText,
    sigma: favIconSigma,
  },
} as const
