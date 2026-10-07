// Link público do cliente respeitando o subcaminho do deploy (ex.: /cavamais-portal/ no GitHub Pages).
export const clientLink = (token: string, origin: string = globalThis.location?.origin ?? '', base: string = (import.meta.env as { BASE_URL?: string } | undefined)?.BASE_URL ?? '/') =>
  `${origin}${base.endsWith('/') ? base : `${base}/`}obra/${token}`
