export type CountryResult = {
  uuid: string
  name: string
  region: string
  capitals?: string
  flagEmoji?: string
}

const BASE_URL = 'https://api.restcountries.com/countries/v5'

export class CountryFetchError extends Error {}

type RawCountry = {
  uuid: string
  names?: { common?: string; official?: string }
  region?: string
  capitals?: { name: string }[]
  flag?: { emoji: string }
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
  const response = await fetch(
    `/api/countries?q=${encodeURIComponent(query)}`,
    {
      signal,
    }
  )

  if (!response.ok) {
    throw new CountryFetchError(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as CountryResult[]
}

export async function searchCountriesFromApi(
  query: string,
  signal: AbortSignal
): Promise<CountryResult[]> {
  const apiKey = process.env.REST_COUNTRIES_API_KEY
  if (!apiKey) {
    throw new CountryFetchError('REST_COUNTRIES_API_KEY is not configured')
  }

  const url = `${BASE_URL}?q=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new CountryFetchError(`Request failed with status ${response.status}`)
  }

  const data = (await response.json()) as { data: { objects: RawCountry[] } }
  console.log(data.data.objects)
  return data.data.objects
    .map(
      (country): CountryResult => ({
        uuid: country.uuid,
        name: country.names?.common ?? 'Unknown',
        region: country.region ?? '',
        capitals: country.capitals?.[0].name ?? '',
        flagEmoji: country.flag?.emoji ?? '',
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)
}
