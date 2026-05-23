import { entries } from 'mobx'
import { Popover } from 'react-tiny-popover'
import { PopoverCard } from 'src/view/component/popover-card'
import { AvatarCircles } from 'src/view/component/shadcn/ui/avatar-circles'
import { Text } from 'src/view/component/text'

type CooperateInfo = {
  clientId: number
  userId: string
  name: string
  avatar: string
  color: string
}

export const CooperateComp: FC<{}> = observer(({}) => {
  const [show, setShow] = useState(false)

  const cooperates = entries(YClients.others).map(([clientId, other]) => ({
    clientId: Number(clientId),
    userId: other.userId,
    name: other.userName,
    avatar: 'createUrlFromSvgString(other.userAvatar)',
    color: other.color,
  }))

  return (
    <G className={cls('')}>
      <Popover
        isOpen={show}
        positions={['bottom']}
        onClickOutside={() => setShow(false)}
        content={<CooperatePopup cooperates={cooperates} />}>
        <AvatarCircles
          avatarUrls={cooperates.map((cooperate) => ({
            imageUrl: cooperate.avatar,
            color: cooperate.color,
          }))}
          numPeople={3}
          onClick={() => setShow(!show)}
        />
      </Popover>
    </G>
  )
})

const CooperatePopup: FC<{ cooperates: CooperateInfo[] }> = observer(
  ({ cooperates }) => {
    return (
      <PopoverCard>
        <G vertical='auto 1fr'>
          <G horizontal center className={cls('popup-header')}>
            <Text>当前协作人员(点击进入观察)</Text>
          </G>
          <G className={cls('popup-list')}>
            {cooperates.map((cooperate) => (
              <G
                horizontal='auto 1fr'
                center
                className={cls('popup-item')}
                onClick={() => {
                  YClients.observingClientId = cooperate.clientId
                }}>
                <img src={cooperate.avatar} />
                <Text style={{ alignSelf: 'center' }}>{cooperate.name}</Text>
              </G>
            ))}
          </G>
        </G>
      </PopoverCard>
    )
  },
)

const cls = classes(css`
  &-popup {
    &-header {
      height: fit-content;
      margin-bottom: 8px;
      ${styles.textHead}
    }
    &-item {
      gap: 8px;
      padding: 8px;
      cursor: pointer;
      ${styles.borderRadius}
      ${styles.bgHoverGray}
      ${styles.textCommon}
      & img {
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }
    }
  }
`)
