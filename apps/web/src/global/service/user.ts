import { miniId } from '@gitborlando/utils'
import multiavatar from '@multiavatar/multiavatar/esm'
import autobind from 'class-autobind-decorator'
import { nickName } from 'src/utils/nick-name'

@autobind
class UserServiceClass {
  userId = miniId(8)
  avatar = multiavatar(this.userId)
  userName = nickName.getNickName()

  constructor() {}
}

export const UserService = new UserServiceClass()
