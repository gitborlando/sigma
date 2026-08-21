import { useQueryClient } from '@tanstack/react-query'
import { Github, LucideLanguages } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { Icon } from 'src/view/component/svg-icon'
import { Text } from 'src/view/component/text'
import { useAsyncState } from 'src/view/hooks/toolkit/use-async-state'
import { useGlobalServices } from 'src/view/hooks/use-services'
import { getLanguage, setLanguage } from 'src/view/i18n/config'
import { LoginDialogComp } from 'src/view/pages/home/login-dialog'
import { QUERY_KEY } from 'src/view/private/tanstack-query'

export const HomeHeaderComp: FC<{}> = observer(({}) => {
  const { uploader, objectMgr, authAPI } = useGlobalServices()
  const { docAction } = useGlobalServices()
  const query = useQueryClient()
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)

  const handleLanguageChange = () => {
    setLanguage(getLanguage() === 'zh' ? 'en' : 'zh')
  }

  const handleUploadFile = async () => {
    await uploader.open({ accept: '.json', multiple: false })
    const file = uploader.files[0]
    if (!file) return

    objectMgr.addObject('file', file.name, file)
    navigate(`fileId/${file.name}?applyRecord=true&maxError=10`)
  }

  const [user] = useAsyncState(null, authAPI.getUser)

  return (
    <G className={cls()} horizontal='auto 1fr' center gap={16}>
      <G horizontal center gap={8}>
        <Icon src={Assets.favIcon.sigmaLogoText2} className={cls('title-icon')} />
        <a
          href='https://github.com/gitborlando/editor'
          target='_blank'
          className={cls('title-github')}>
          <Lucide icon={Github} size={20} />
        </a>
        <Btn
          icon={<Lucide icon={LucideLanguages} size={20} />}
          onClick={handleLanguageChange}
        />
      </G>
      <G className={cls('right')} horizontal center gap={16}>
        <G horizontal center gap={8}>
          {!user && (
            <Btn variant='outline' onClick={() => setLoginOpen(true)}>
              {t('login')}
            </Btn>
          )}
          <Btn
            variant='outline'
            onClick={() => navigate('fileId/mock?applyRecord=true&maxError=10')}>
            Demo
          </Btn>
          <Btn variant='outline' onClick={handleUploadFile}>
            导入文件
          </Btn>
          <Btn
            variant='solid'
            onClick={async () => {
              await docAction.newDoc(false)
              query.invalidateQueries({ queryKey: [QUERY_KEY.listFiles] })
            }}>
            {t('new file')}
          </Btn>
          <Btn variant='solid'>{t('new file')}</Btn>
          <Btn variant='outline' onClick={() => authAPI.signOut()}>
            退出登陆
          </Btn>
        </G>
        {user ? (
          <>
            <img src={user?.avatar} className={cls('avatar')} />
            <Text variant='common'>{user?.name}</Text>
          </>
        ) : (
          <Btn
            variant='outline'
            onClick={() => authAPI.signInWithOAuth({ provider: 'google' })}>
            Google登录
          </Btn>
        )}
      </G>
      <LoginDialogComp
        variant='split'
        open={loginOpen}
        onOpenChange={setLoginOpen}
      />
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
      width: 80px;
      height: 40px;
      ${styles.textPrimary}
    }
    &-github {
      width: 24px;
      height: 24px;
      display: grid;
      place-content: center;
      color: black;
    }
  }
  &-right {
    justify-content: flex-end;
  }
  &-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
`)
