export type CountryResult = {
  uuid: string
  name: string
  region: string
  capitals?: string
}

const BASE_URL = 'https://api.restcountries.com/countries/v5'

export class CountryFetchError extends Error {}

type RawCountry = {
  uuid: string
  names?: { common?: string; official?: string }
  region?: string
  capitals?: { name: string }[]
  flag?: string
}

/**
 * Searches the REST Countries API by (partial) country name.
 *
 * Note: this API returns HTTP 404 with a JSON error body when there are
 * no matches, rather than a 200 with an empty array — so a 404 here is
 * treated as "zero results," not a real error.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal
): Promise<CountryResult[]> {
  const url = `${BASE_URL}?q=${query}`

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer rc_live_a62706d1101b4a3495662123881a2d6e',
    },
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new CountryFetchError(`Request failed with status ${response.status}`)
  }

  const data = (await response.json()) as { data: { objects: RawCountry[] } }

  return data.data.objects
    .map(
      (country): CountryResult => ({
        uuid: country.uuid,
        name: country.names?.common ?? 'Unknown',
        region: country.region ?? '',
        capitals: country.capitals?.[0].name ?? '',
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)
}
