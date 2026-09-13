import { AuthSchema } from '@sigma/api'
import { useQuery } from '@tanstack/react-query'
import { Github, LucideLanguages } from 'lucide-react'
import { Fragment } from 'react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { Menu, MenuItem } from 'src/view/component/menu'
import { Icon } from 'src/view/component/svg-icon'
import { useGlobalServices } from 'src/view/hooks/use-services'
import { getLanguage, setLanguage } from 'src/view/i18n/config'
import { invalidateAuthState } from 'src/view/pages/home'
import { LoginDialogComp } from 'src/view/pages/home/login-dialog'
import { invalidateQuery, QUERY_KEY } from 'src/view/query'
import { useHomeState } from 'src/view/states/home'

export const HomeHeaderComp: FC<{}> = observer(({}) => {
  const navigate = useNavigate()
  const { uploader, objectMgr, authAPI } = useGlobalServices()
  const { fileAction } = useGlobalServices()

  const { data: user } = useQuery({
    queryKey: [QUERY_KEY.getUser],
    queryFn: authAPI.getUser,
  })

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
              await fileAction.newFile(false)
              invalidateQuery([QUERY_KEY.listFiles])
            }}>
            {t('new file')}
          </Btn>
        </G>
        <AuthComp user={user} />
      </G>
      <LoginDialogComp />
    </G>
  )
})

const AuthComp: FC<{ user: AuthSchema['user'] | Nil }> = observer(({ user }) => {
  const homeState = useHomeState()
  const { authAPI } = useGlobalServices()

  let menus: MenuItem[][] = [
    [
      {
        name: '退出登陆',
        callback: async () => {
          await authAPI.signOut()
          invalidateAuthState()
        },
      },
    ],
  ]

  return (
    <Fragment>
      {!user && (
        <Btn variant='outline' onClick={() => (homeState.loginDialogOpened = true)}>
          {t('login')}
        </Btn>
      )}
      {user ? (
        <Menu menus={menus}>
          <img src={user?.avatar} className={cls('avatar')} />
        </Menu>
      ) : (
        <img src={Assets.home.login.guest} className={cls('avatar')} />
      )}
    </Fragment>
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
    cursor: pointer;
  }
`)
