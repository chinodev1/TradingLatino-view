// Cloudflare Pages Function — proxy para Yahoo Finance (evita CORS del browser)

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get("action");
  const query  = url.searchParams.get("q") ?? "";
  const symbol = url.searchParams.get("symbol") ?? "";
  const interval = url.searchParams.get("interval") ?? "1d";
  const range    = url.searchParams.get("range") ?? "2y";

  const headers = { "Content-Type": "application/json" };

  const YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    if (action === "search") {
      if (!query.trim()) {
        return new Response(JSON.stringify({ quotes: [] }), { headers });
      }
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
      const res = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
      if (!res.ok) return new Response(JSON.stringify({ quotes: [] }), { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers });

    } else if (action === "chart") {
      if (!symbol) {
        return new Response(JSON.stringify({ chart: { result: null, error: "No symbol" } }), { headers });
      }
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`;
      const res = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
      if (!res.ok) return new Response(JSON.stringify({ chart: { result: null } }), { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers });

    } else {
      return new Response(JSON.stringify({ error: "Unknown action. Use ?action=search or ?action=chart" }), { status: 400, headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 200, headers });
  }
}
