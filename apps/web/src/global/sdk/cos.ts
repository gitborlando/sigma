import COS from 'cos-js-sdk-v5'

export const cos = new COS({
  getAuthorization: async (_, callback) => {
    const { credentials, startTime, expiredTime } = await (
      await fetch('https://1303161364-islqv8v2sx.ap-guangzhou.tencentscf.com')
    ).json()
    callback({
      TmpSecretId: credentials.tmpSecretId,
      TmpSecretKey: credentials.tmpSecretKey,
      SecurityToken: credentials.sessionToken,
      StartTime: startTime,
      ExpiredTime: expiredTime,
    })
  },
})

export const defaultCosOptions = {
  Bucket: 'editor-1303161364',
  Region: 'ap-guangzhou',
}

export const defaultCosOptionsWithDomain = {
  ...defaultCosOptions,
  Domain: 'cos.editor.gitborlando.com',
}
