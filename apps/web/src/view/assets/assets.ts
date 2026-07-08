// 自动生成的静态资源路径常量
import editorCursorResize from './editor/cursor/resize.svg'
import editorCursorSelect from './editor/cursor/select.svg'
import editorDesignAlignAlignCenter from './editor/design/align/align-center.svg'
import editorDesignAlignAlignLeft from './editor/design/align/align-left.svg'
import editorDesignAlignAlignRight from './editor/design/align/align-right.svg'
import editorDesignAlignVerticalBottom from './editor/design/align/vertical-bottom.svg'
import editorDesignAlignVerticalCenter from './editor/design/align/vertical-center.svg'
import editorDesignAlignVerticalTop from './editor/design/align/vertical-top.svg'
import editorDesignGeomCornerRadius from './editor/design/geom/corner-radius.svg'
import editorDesignGeomFlipHorizontal from './editor/design/geom/flip-horizontal.svg'
import editorDesignGeomFlipVertical from './editor/design/geom/flip-vertical.svg'
import editorDesignGeomHeight from './editor/design/geom/height.svg'
import editorDesignGeomInnerRadiusRatio from './editor/design/geom/inner-radius-ratio.svg'
import editorDesignGeomLockAspectRatio from './editor/design/geom/lock-aspect-ratio.svg'
import editorDesignGeomRotate from './editor/design/geom/rotate.svg'
import editorDesignGeomWidth from './editor/design/geom/width.svg'
import editorDesignGeomX from './editor/design/geom/x.svg'
import editorDesignGeomY from './editor/design/geom/y.svg'
import editorHeaderMove from './editor/header/move.svg'
import editorHeaderSelect from './editor/header/select.svg'
import editorNodeEllipse from './editor/node/ellipse.svg'
import editorNodeFrame from './editor/node/frame.svg'
import editorNodeImage from './editor/node/image.svg'
import editorNodeLine from './editor/node/line.svg'
import editorNodeRect from './editor/node/rect.svg'
import editorNodeText from './editor/node/text.svg'
import editorRPOperateFillNone from './editor/RP/operate/fill/none.png'
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
    design: {
      align: {
        alignCenter: editorDesignAlignAlignCenter,
        alignLeft: editorDesignAlignAlignLeft,
        alignRight: editorDesignAlignAlignRight,
        verticalBottom: editorDesignAlignVerticalBottom,
        verticalCenter: editorDesignAlignVerticalCenter,
        verticalTop: editorDesignAlignVerticalTop,
      },
      geom: {
        cornerRadius: editorDesignGeomCornerRadius,
        flipHorizontal: editorDesignGeomFlipHorizontal,
        flipVertical: editorDesignGeomFlipVertical,
        height: editorDesignGeomHeight,
        innerRadiusRatio: editorDesignGeomInnerRadiusRatio,
        lockAspectRatio: editorDesignGeomLockAspectRatio,
        rotate: editorDesignGeomRotate,
        width: editorDesignGeomWidth,
        x: editorDesignGeomX,
        y: editorDesignGeomY,
      },
    },
    header: {
      move: editorHeaderMove,
      select: editorHeaderSelect,
    },
    node: {
      ellipse: editorNodeEllipse,
      frame: editorNodeFrame,
      image: editorNodeImage,
      line: editorNodeLine,
      rect: editorNodeRect,
      text: editorNodeText,
    },
    RP: {
      operate: {
        fill: {
          none: editorRPOperateFillNone,
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
