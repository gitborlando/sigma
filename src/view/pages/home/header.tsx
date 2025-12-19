import { Icon } from '@gitborlando/widget'
import { Github, LucideLanguages } from 'lucide-react'
import { UserService } from 'src/global/service/user'
import { Btn } from 'src/view/component/btn'
import { Text } from 'src/view/component/text'
import { getLanguage, setLanguage } from 'src/view/i18n/config'

export const HomeHeaderComp: FC<{}> = observer(({}) => {
  const navigate = useNavigate()
  const handleLanguageChange = () => {
    setLanguage(getLanguage() === 'zh' ? 'en' : 'zh')
  }
  return (
    <G className={cls()} horizontal='auto auto 1fr' center gap={16}>
      <G horizontal center gap={8} className={cls('title')}>
        <Icon url={Assets.favIcon.sigma4} className={cls('title-icon')} />
        <h4>Sigma Editor</h4>
      </G>
      <G horizontal center gap={8}>
        <a href='https://github.com/gitborlando/editor' target='_blank'>
          <Lucide icon={Github} size={20} />
        </a>
        <Btn
          icon={<Lucide icon={LucideLanguages} size={20} />}
          onClick={handleLanguageChange}
        />
      </G>
      <G className={cls('right')} horizontal='auto auto auto' center gap={16}>
        <G horizontal center gap={8}>
          <Btn variant='outline' onClick={() => navigate('/test')}>
            测试页
          </Btn>
          <Btn variant='outline' onClick={() => navigate('fileId/mock')}>
            Mock页
          </Btn>
          <Btn variant='solid'>{t('file.new')}</Btn>
        </G>
        <G
          dangerouslySetInnerHTML={{ __html: UserService.avatar }}
          style={{ width: '32px', height: '32px' }}></G>
        <Text variant='common'>{UserService.userName}</Text>
      </G>
    </G>
  )
})

const cls = classes(css`
  height: 48px;
  padding: 0 20px;
  justify-content: space-between;
  ${styles.borderBottom}
  &-title {
    font-weight: 600;
    font-size: 18px;
    color: var(--color);
    &-icon {
      width: 24px;
      height: 24px;
    }
  }
  &-right {
    justify-content: flex-end;
  }
`)
