import { miniId } from '@gitborlando/utils'
import multiavatar from '@multiavatar/multiavatar/esm'
import autobind from 'class-autobind-decorator'
import { nickName } from 'src/utils/nick-name'

@autobind
class UserServiceClass {
  userId = miniId()
  avatar = multiavatar(this.userId)
  userName = nickName.getNickName()

  constructor() {}
}

export const UserService = new UserServiceClass()
