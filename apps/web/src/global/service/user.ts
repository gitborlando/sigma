import { miniId } from '@gitborlando/utils'
import multiavatar from '@multiavatar/multiavatar/esm'
import { nickName } from 'src/utils/nick-name'

class UserClass {
  userId = miniId(8)
  avatar = multiavatar(this.userId)
  userName = nickName.getNickName()

  constructor() {}
}

export const UserService = autoBind(new UserClass())
