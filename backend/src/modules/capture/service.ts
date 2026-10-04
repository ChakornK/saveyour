export type CaptureErrorCode = 'invalid_url' | 'unsupported_platform'

export interface CanonicalUrl {
  value: string
  platform: 'instagram' | 'reddit' | 'tiktok' | 'facebook' | 'x' | 'unknown'
}

const providers: Array<[CanonicalUrl['platform'], RegExp]> = [
  ['instagram', /^https?:\/\/(?:www\.)?instagram\.com\//i],
  ['reddit', /^https?:\/\/(?:www\.)?reddit\.com\//i],
  ['tiktok', /^https?:\/\/(?:www\.)?tiktok\.com\//i],
  ['facebook', /^https?:\/\/(?:www\.)?facebook\.com\//i],
  ['x', /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i],
]

export const normalizeUrl = (raw: string): CanonicalUrl => {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('invalid_url')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname === 'localhost') {
    throw new Error('invalid_url')
  }
  const provider = providers.find(([, pattern]) => pattern.test(url.toString()))?.[0] ?? 'unknown'
  if (provider === 'unknown') throw new Error('unsupported_platform')
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key)
  url.hash = ''
  return { value: url.toString(), platform: provider }
}
