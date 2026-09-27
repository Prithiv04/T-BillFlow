import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export interface TreasuryYieldResponse {
  yield: number | null;
  observationDate: string | null;
  source: string;
  status: 'ok' | 'unavailable';
  error?: string;
}

export async function GET() {
  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear, currentYear - 1];

  for (const year of yearsToTry) {
    try {
      const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*',
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        continue;
      }

      const xml = await res.text();
      const entries = xml.split('<entry>');
      if (entries.length <= 1) {
        continue;
      }

      // Read from latest entry backwards to find the most recent valid 3-month Treasury yield
      for (let i = entries.length - 1; i >= 1; i--) {
        const entry = entries[i];
        const rateMatch = entry.match(/<d:BC_3MONTH[^>]*>([^<]+)<\/d:BC_3MONTH>/);
        const dateMatch = entry.match(/<d:NEW_DATE[^>]*>([^<]+)<\/d:NEW_DATE>/);

        if (rateMatch && rateMatch[1] && rateMatch[1].trim() !== '') {
          const parsedYield = parseFloat(rateMatch[1]);
          if (!isNaN(parsedYield)) {
            const rawDate = dateMatch ? dateMatch[1] : null;
            const observationDate = rawDate ? rawDate.split('T')[0] : null;

            return NextResponse.json({
              yield: parsedYield,
              observationDate,
              source: 'U.S. Department of the Treasury (Daily Treasury Par Yield Curve Rates)',
              status: 'ok',
            });
          }
        }
      }
    } catch (err) {
      console.error(`[treasury-yield] Error fetching Treasury yield for year ${year}:`, err);
    }
  }

  // Explicit unavailable state - no fake fallback
  return NextResponse.json({
    yield: null,
    observationDate: null,
    source: 'U.S. Department of the Treasury (Daily Treasury Par Yield Curve Rates)',
    status: 'unavailable',
    error: 'Treasury yield data currently unavailable',
  });
}
