export let docGetter = (): S.Doc => {
  throw new Error('docGetter is not set')
}

export const setupDocGetter = (getter: () => S.Doc) => {
  docGetter = getter
}
