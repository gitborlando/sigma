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
import editorRPDesignAlignAlignCenter from './editor/RP/design/align/align-center.svg'
import editorRPDesignAlignAlignLeft from './editor/RP/design/align/align-left.svg'
import editorRPDesignAlignAlignRight from './editor/RP/design/align/align-right.svg'
import editorRPDesignAlignVerticalBottom from './editor/RP/design/align/vertical-bottom.svg'
import editorRPDesignAlignVerticalCenter from './editor/RP/design/align/vertical-center.svg'
import editorRPDesignAlignVerticalTop from './editor/RP/design/align/vertical-top.svg'
import editorRPOperateFillNone from './editor/RP/operate/fill/none.png'
import editorRPOperateGeoH from './editor/RP/operate/geo/h.svg'
import editorRPOperateGeoRadius from './editor/RP/operate/geo/radius.svg'
import editorRPOperateGeoRotate from './editor/RP/operate/geo/rotate.svg'
import editorRPOperateGeoW from './editor/RP/operate/geo/w.svg'
import editorRPOperateGeoX from './editor/RP/operate/geo/x.svg'
import editorRPOperateGeoY from './editor/RP/operate/geo/y.svg'
import editorRPOperatePickerDefaultImage from './editor/RP/operate/picker/default-image.png'
import favIconSigmaLoading2 from './fav-icon/sigma-loading-2.svg'
import favIconSigmaLoading from './fav-icon/sigma-loading.svg'
import favIconSigmaLogoText2 from './fav-icon/sigma-logo-text-2.svg'
import favIconSigmaLogoText from './fav-icon/sigma-logo-text.svg'
import favIconSigmaLogo from './fav-icon/sigma-logo.jpg'

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
      design: {
        align: {
          alignCenter: editorRPDesignAlignAlignCenter,
          alignLeft: editorRPDesignAlignAlignLeft,
          alignRight: editorRPDesignAlignAlignRight,
          verticalBottom: editorRPDesignAlignVerticalBottom,
          verticalCenter: editorRPDesignAlignVerticalCenter,
          verticalTop: editorRPDesignAlignVerticalTop,
        },
      },
      operate: {
        fill: {
          none: editorRPOperateFillNone,
        },
        geo: {
          h: editorRPOperateGeoH,
          radius: editorRPOperateGeoRadius,
          rotate: editorRPOperateGeoRotate,
          w: editorRPOperateGeoW,
          x: editorRPOperateGeoX,
          y: editorRPOperateGeoY,
        },
        picker: {
          defaultImage: editorRPOperatePickerDefaultImage,
        },
      },
    },
  },
  favIcon: {
    sigmaLoading2: favIconSigmaLoading2,
    sigmaLoading: favIconSigmaLoading,
    sigmaLogoText2: favIconSigmaLogoText2,
    sigmaLogoText: favIconSigmaLogoText,
    sigmaLogo: favIconSigmaLogo,
  },
} as const
