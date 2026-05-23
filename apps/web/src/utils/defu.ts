import { createDefu } from 'defu'

export const defuOverrideArray = createDefu((obj, key, value) => {
  if (Array.isArray(value)) {
    obj[key] = value
    return true
  }
})
