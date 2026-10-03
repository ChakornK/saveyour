import { Elysia } from 'elysia'

export const ownerScope = new Elysia({ name: 'owner-scope' }).derive(({ headers, set }) => {
  const ownerId = headers['x-owner-id']
  if (!ownerId || ownerId.length > 128) { set.status = 401; throw new Error('x-owner-id is required') }
  return { ownerId }
})
