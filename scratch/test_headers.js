import * as cheerio from 'cheerio';

async function testGooglebotUA() {
  const videoId = 'uQnvqiltk8s';
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const resp = await fetch(url, { headers });
    const html = await resp.text();
    console.log('Googlebot HTML status:', resp.status, 'length:', html.length);

    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const desc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');

    console.log('🎉 Googlebot Extracted Title:', title);
    console.log('🎉 Googlebot Extracted Description:', desc?.slice(0, 300));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testGooglebotUA();
