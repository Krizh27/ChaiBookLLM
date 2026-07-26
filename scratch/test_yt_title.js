import fs from 'fs';

async function findTitlesInHtml() {
  const videoId = 'uQnvqiltk8s';
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await resp.text();

  // Search for "Future of DSA" in HTML
  const matches = [...html.matchAll(/Future of DSA[^\"]*/gi)];
  console.log('Matches for "Future of DSA":', matches.map(m => m[0]));

  // Search for "videoDetails"
  const vDetailsIdx = html.indexOf('videoDetails');
  console.log('videoDetails index:', vDetailsIdx);
  if (vDetailsIdx !== -1) {
    console.log(html.slice(vDetailsIdx, vDetailsIdx + 300));
  }

  // Search for any title fields in json
  const titleMatches = [...html.matchAll(/"title":\{"simpleText":"([^"]+)"\}/g)];
  console.log('simpleText titles:', titleMatches.map(m => m[1]).slice(0, 10));
}

findTitlesInHtml();
