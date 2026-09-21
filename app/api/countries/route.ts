import { NextResponse } from 'next/server'
import { searchCountriesFromApi } from '@/lib/countries'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const results = await searchCountriesFromApi(query, request.signal)
    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new NextResponse(null, { status: 499 })
    }

    return NextResponse.json(
      { error: 'Unable to search countries' },
      { status: 502 }
    )
  }
}