// 自动生成的静态资源路径常量
import editorDesignAlignAlignCenter from './editor/design/align/align-center.svg'
import editorDesignAlignAlignLeft from './editor/design/align/align-left.svg'
import editorDesignAlignAlignRight from './editor/design/align/align-right.svg'
import editorDesignAlignVerticalBottom from './editor/design/align/vertical-bottom.svg'
import editorDesignAlignVerticalCenter from './editor/design/align/vertical-center.svg'
import editorDesignAlignVerticalTop from './editor/design/align/vertical-top.svg'
import editorDesignFillDefaultImage from './editor/design/fill/default-image.png'
import editorDesignGeomCornerRadius from './editor/design/geom/corner-radius.svg'
import editorDesignGeomFlipHorizontal from './editor/design/geom/flip-horizontal.svg'
import editorDesignGeomFlipVertical from './editor/design/geom/flip-vertical.svg'
import editorDesignGeomHeight from './editor/design/geom/height.svg'
import editorDesignGeomInnerRadiusRatio from './editor/design/geom/inner-radius-ratio.svg'
import editorDesignGeomLockAspectRatio from './editor/design/geom/lock-aspect-ratio.svg'
import editorDesignGeomRotate90 from './editor/design/geom/rotate-90.svg'
import editorDesignGeomRotate from './editor/design/geom/rotate.svg'
import editorDesignGeomWidth from './editor/design/geom/width.svg'
import editorDesignGeomX from './editor/design/geom/x.svg'
import editorDesignGeomY from './editor/design/geom/y.svg'
import editorDesignMiscConfig from './editor/design/misc/config.svg'
import editorDesignStrokeCapButt from './editor/design/stroke/cap-butt.svg'
import editorDesignStrokeCapRound from './editor/design/stroke/cap-round.svg'
import editorDesignStrokeCapSquare from './editor/design/stroke/cap-square.svg'
import editorDesignStrokeJoinBevel from './editor/design/stroke/join-bevel.svg'
import editorDesignStrokeJoinMiter from './editor/design/stroke/join-miter.svg'
import editorDesignStrokeJoinRound from './editor/design/stroke/join-round.svg'
import editorDesignStrokeSideAll from './editor/design/stroke/side-all.svg'
import editorDesignStrokeSideBottom from './editor/design/stroke/side-bottom.svg'
import editorDesignStrokeSideLeft from './editor/design/stroke/side-left.svg'
import editorDesignStrokeSideRight from './editor/design/stroke/side-right.svg'
import editorDesignStrokeSideTop from './editor/design/stroke/side-top.svg'
import editorDesignStrokeStrokeWidth from './editor/design/stroke/stroke-width.svg'
import editorHeaderMove from './editor/header/move.svg'
import editorHeaderSelect from './editor/header/select.svg'
import editorNodeEllipse from './editor/node/ellipse.svg'
import editorNodeFrame from './editor/node/frame.svg'
import editorNodeImage from './editor/node/image.svg'
import editorNodeLine from './editor/node/line.svg'
import editorNodeRect from './editor/node/rect.svg'
import editorNodeText from './editor/node/text.svg'
import favIconSigmaLoading2 from './fav-icon/sigma-loading-2.svg'
import favIconSigmaLoading from './fav-icon/sigma-loading.svg'
import favIconSigmaLogoText2 from './fav-icon/sigma-logo-text-2.svg'
import favIconSigmaLogoText from './fav-icon/sigma-logo-text.svg'
import favIconSigmaLogo from './fav-icon/sigma-logo.jpg'

export const Assets = {
  editor: {
    design: {
      align: {
        alignCenter: editorDesignAlignAlignCenter,
        alignLeft: editorDesignAlignAlignLeft,
        alignRight: editorDesignAlignAlignRight,
        verticalBottom: editorDesignAlignVerticalBottom,
        verticalCenter: editorDesignAlignVerticalCenter,
        verticalTop: editorDesignAlignVerticalTop,
      },
      fill: { defaultImage: editorDesignFillDefaultImage },
      geom: {
        cornerRadius: editorDesignGeomCornerRadius,
        flipHorizontal: editorDesignGeomFlipHorizontal,
        flipVertical: editorDesignGeomFlipVertical,
        height: editorDesignGeomHeight,
        innerRadiusRatio: editorDesignGeomInnerRadiusRatio,
        lockAspectRatio: editorDesignGeomLockAspectRatio,
        rotate90: editorDesignGeomRotate90,
        rotate: editorDesignGeomRotate,
        width: editorDesignGeomWidth,
        x: editorDesignGeomX,
        y: editorDesignGeomY,
      },
      misc: { config: editorDesignMiscConfig },
      stroke: {
        capButt: editorDesignStrokeCapButt,
        capRound: editorDesignStrokeCapRound,
        capSquare: editorDesignStrokeCapSquare,
        joinBevel: editorDesignStrokeJoinBevel,
        joinMiter: editorDesignStrokeJoinMiter,
        joinRound: editorDesignStrokeJoinRound,
        sideAll: editorDesignStrokeSideAll,
        sideBottom: editorDesignStrokeSideBottom,
        sideLeft: editorDesignStrokeSideLeft,
        sideRight: editorDesignStrokeSideRight,
        sideTop: editorDesignStrokeSideTop,
        strokeWidth: editorDesignStrokeStrokeWidth,
      },
    },
    header: { move: editorHeaderMove, select: editorHeaderSelect },
    node: {
      ellipse: editorNodeEllipse,
      frame: editorNodeFrame,
      image: editorNodeImage,
      line: editorNodeLine,
      rect: editorNodeRect,
      text: editorNodeText,
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
