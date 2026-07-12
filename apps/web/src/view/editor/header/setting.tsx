import { Settings } from 'lucide-react'
import { CommonBalanceItem } from 'src/view/component/balance-item'
import { Btn } from 'src/view/component/btn'
import { DragPanel } from 'src/view/component/drag-panel'
import { Lucide } from 'src/view/component/lucide'
import { Segments } from 'src/view/component/segments'
import { useEditorServices } from 'src/view/hooks/editor'
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
        id='setting'
        show={showSetting}
        width={400}
        center
        title={t('settings')}
        showFunc={setShowSetting}>
        {/* <SwitchBar
          options={[
            { label: t('general settings'), value: 'common' },
            { label: t('dev settings'), value: 'dev' },
          ]}
          value={settingType}
          onChange={(value) => setSettingType(value as 'common' | 'dev')}
        /> */}
        <G className={settingCls()} gap={8}>
          <CommonSettingComp x-if={settingType === 'common'} />
        </G>
      </DragPanel>
    </>
  )
})

export const CommonSettingComp: FC<{}> = observer(({}) => {
  const { setting } = useEditorServices()
  const settings = setting
  const {
    autosave,
    showFPS,
    devMode,
    ignoreUnVisible,
    needSliceRender,
    showDirtyRect,
    fullRender,
  } = settings

  return (
    <G gap={8}>
      <CommonBalanceItem label={t('language')}>
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
        onChange={(value) => (settings.autosave = value)}
      />
      <BooleanSettingComp
        label={t('dev mode')}
        value={devMode}
        onChange={(value) => (settings.devMode = value)}
      />
      <BooleanSettingComp
        label={t('full render')}
        value={fullRender}
        onChange={(value) => (settings.fullRender = value)}
      />
      <BooleanSettingComp
        label={t('show dirty rect')}
        value={showDirtyRect}
        onChange={(value) => (settings.showDirtyRect = value)}
      />
      <BooleanSettingComp
        label={t('skip render unrecognizable node')}
        value={ignoreUnVisible}
        onChange={(value) => (settings.ignoreUnVisible = value)}
      />
      <BooleanSettingComp
        label={t('slice render optimization when zoom')}
        value={needSliceRender}
        onChange={(value) => (settings.needSliceRender = value)}
      />
      <BooleanSettingComp
        label={t('show FPS')}
        value={showFPS}
        onChange={(value) => (settings.showFPS = value)}
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

const SwitchComp: FC<{ value: boolean; onChange: (value: boolean) => void }> = ({
  value,
  onChange,
}) => {
  return (
    <G className={switchCls()} onClick={() => onChange(!value)}>
      <G className={cx(switchCls('inner'), value && switchCls('inner-checked'))}></G>
    </G>
  )
}

export const settingCls = classes(css`
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
