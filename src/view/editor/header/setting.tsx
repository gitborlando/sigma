import { Settings } from 'lucide-react'
import { getEditorSetting } from 'src/editor/editor/setting'
import { CommonBalanceItem } from 'src/view/component/balance-item'
import { Btn } from 'src/view/component/btn'
import { DragPanel } from 'src/view/component/drag-panel'
import { Segments } from 'src/view/component/segments'
import { getLanguage, setLanguage } from 'src/view/i18n/config'

export const EditorHeaderSettingComp: FC<{}> = observer(({}) => {
  const [showSetting, setShowSetting] = useState(false)
  const [settingType, setSettingType] = useState<'common' | 'dev'>('common')
  return (
    <>
      <Btn
        size={32}
        icon={<Lucide icon={Settings} size={20} />}
        onClick={() => setShowSetting(!showSetting)}
      />
      <DragPanel
        width={400}
        center
        x-if={showSetting}
        title={t('common.setting')}
        closeFunc={() => setShowSetting(false)}>
        {/* <SwitchBar
          options={[
            { label: t('special.generalSetting'), value: 'common' },
            { label: t('special.devSetting'), value: 'dev' },
          ]}
          value={settingType}
          onChange={(value) => setSettingType(value as 'common' | 'dev')}
        /> */}
        <G className={editorSettingCls()} gap={8}>
          <CommonSettingComp x-if={settingType === 'common'} />
        </G>
      </DragPanel>
    </>
  )
})

export const CommonSettingComp: FC<{}> = observer(({}) => {
  const setting = getEditorSetting()
  const {
    autosave,
    showFPS,
    devMode,
    ignoreUnVisible,
    needSliceRender,
    showDirtyRect,
  } = setting

  return (
    <G gap={8}>
      <CommonBalanceItem label={t('noun.language')}>
        <Segments
          options={[
            { label: 'English', value: 'en' },
            { label: '中文', value: 'zh' },
          ]}
          value={getLanguage()}
          onChange={(value) => setLanguage(value as 'zh' | 'en')}
        />
      </CommonBalanceItem>
      <BooleanSettingComp
        label={t('auto save')}
        value={autosave}
        onChange={(value) => (setting.autosave = value)}
      />
      <BooleanSettingComp
        label={t('dev mode')}
        value={devMode}
        onChange={(value) => (setting.devMode = value)}
      />
      <BooleanSettingComp
        label={t('show dirty rect')}
        value={showDirtyRect}
        onChange={(value) => (setting.showDirtyRect = value)}
      />
      <BooleanSettingComp
        label={t('skip render unrecognizable node')}
        value={ignoreUnVisible}
        onChange={(value) => (setting.ignoreUnVisible = value)}
      />
      <BooleanSettingComp
        label={t('slice render optimization when zoom')}
        value={needSliceRender}
        onChange={(value) => (setting.needSliceRender = value)}
      />
      <BooleanSettingComp
        label={t('show FPS')}
        value={showFPS}
        onChange={(value) => (setting.showFPS = value)}
      />
    </G>
  )
})

const BooleanSettingComp: FC<{
  label: string
  value: boolean
  onChange: (value: boolean) => void
}> = ({ label, value, onChange }) => {
  return (
    <CommonBalanceItem label={label}>
      <SwitchComp value={value} onChange={onChange} />
    </CommonBalanceItem>
  )
}

const SwitchComp: FC<{
  value: boolean
  onChange: (value: boolean) => void
}> = ({ value, onChange }) => {
  return (
    <G className={switchCls()} onClick={() => onChange(!value)}>
      <G className={cx(switchCls('inner'), value && switchCls('inner-checked'))}></G>
    </G>
  )
}

export const editorSettingCls = classes(css`
  padding: 12px;
  height: fit-content;
`)

export const switchCls = classes(css`
  width: 36px;
  height: 18px;
  border-radius: 99px;
  padding: 3px;
  cursor: pointer;
  outline: 1px solid var(--gray-bg);

  &-inner {
    width: 12px;
    height: 12px;
    border-radius: 99px;
    background-color: #b8b8b8;
    transition: all 0.3s ease;

    &-checked {
      background-color: hsl(var(--hue), 100%, 60%);
      transform: translateX(calc(100% + 6px));
    }
  }
`)
