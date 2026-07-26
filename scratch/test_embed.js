async function testEmbedDetails() {
  const videoId = 'uQnvqiltk8s';
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  const resp = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  const html = await resp.text();
  
  // Search for player response or config JSON in embed HTML
  const configMatch = html.match(/ytp-fullerscreen-edu-button|yt\.setConfig|ytplayer\.config\s*=\s*({.+?});/);
  console.log('configMatch:', configMatch ? configMatch[0].slice(0, 100) : 'None');

  // Search for title string in JSON
  const matches = html.match(/"title"\s*:\s*{"runs"\s*:\s*\[{"text"\s*:\s*"([^"]+)"/);
  console.log('Title match 1:', matches ? matches[1] : 'None');

  const titleMatch2 = html.match(/"title"\s*:\s*"([^"]+)"/);
  console.log('Title match 2:', titleMatch2 ? titleMatch2[1] : 'None');

  const captionMatch = html.match(/"captionTracks"\s*:\s*(\[\{.+?\}\])/);
  console.log('Caption match:', captionMatch ? captionMatch[1].slice(0, 200) : 'None');
}

testEmbedDetails();
