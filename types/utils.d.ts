type Nil = undefined | null

type ID = string

type IDPayload = { id: ID }

type NestPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<NestPartial<U>>
    : T[P] extends object
      ? NestPartial<T[P]>
      : T[P]
}
