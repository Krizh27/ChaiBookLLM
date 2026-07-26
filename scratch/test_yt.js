async function testInvidious() {
  const videoId = 'uQnvqiltk8s';
  console.log('--- Testing Invidious Instances ---');
  
  const instances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://invidious.privacyredirect.com',
    'https://invidious.flokinet.to',
    'https://invidious.lunar.icu'
  ];

  for (const inst of instances) {
    try {
      console.log('Testing instance:', inst);
      const resp = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      console.log('Status:', resp.status);
      if (resp.ok) {
        const data = await resp.json();
        console.log('🎉 Invidious Title:', data.title);
        console.log('Author:', data.author);
        console.log('Description:', data.description?.slice(0, 150));
        console.log('Captions tracks:', data.captions?.map(c => ({ label: c.label, languageCode: c.languageCode, url: c.url })));
        
        if (data.captions && data.captions.length > 0) {
          const capUrl = data.captions[0].url.startsWith('/') ? `${inst}${data.captions[0].url}` : data.captions[0].url;
          console.log('Fetching caption from:', capUrl);
          const capResp = await fetch(capUrl);
          const capText = await capResp.text();
          console.log('Caption length:', capText.length);
          console.log('Caption sample:', capText.slice(0, 300));
        }
        break;
      }
    } catch (e) {
      console.log('Failed:', e.message);
    }
  }
}

testInvidious();
