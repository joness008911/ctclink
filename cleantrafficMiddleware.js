const axios = require('axios'); // or native fetch in Node 18+

function cleanTrafficMiddleware() {
  const apiKey = process.env.CLEANTRAFFIC_API_KEY || "ct_live_aae6f0c0022dd35c5f9fdd4eff6c1525";
  const endpoint = process.env.CLEANTRAFFIC_ENDPOINT || "https://ctclink-production.up.railway.app";

  return async function(req, res, next) {
    // Skip static files & health checks
    if (req.path.match(/\.(css|js|png|jpg|svg|ico)$/) || req.path === '/health') {
      return next();
    }

    // Skip if already verified in this session
    if (req.cookies && req.cookies.ctc_verified === '1') {
      return next();
    }

    const ip = req.headers['cf-connecting-ip'] 
      || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || '127.0.0.1';

    try {
      const response = await axios.post(`${endpoint}/api/classify`, {
        apiKey,
        ip,
        userAgent: req.headers['user-agent'] || '',
        queryString: req.url.includes('?') ? req.url.split('?')[1] : '',
        referer: req.headers['referer'] || '',
        url: req.protocol + '://' + req.get('host') + req.originalUrl
      }, {
        timeout: 2500,
        headers: { 'X-API-Key': apiKey },
        validateStatus: () => true
      });

      if (response.status === 200) {
        const verdict = response.data;
        
        // Return exact 404 or 403 status code if triggered
        if (verdict.action === '404' || verdict.statusCode === 404 || verdict.destination === '404') {
          return res.status(404).send('404 Not Found');
        }
        if (verdict.action === '403' || verdict.statusCode === 403 || verdict.destination === '403') {
          return res.status(403).send('403 Forbidden - Access Denied');
        }

        // Redirect legitimate visitor or custom URL
        if (verdict.destination && verdict.destination !== '404' && verdict.destination !== '403') {
          res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
          return res.redirect(302, verdict.destination);
        }
      }

      res.cookie('ctc_verified', '1', { maxAge: 3600000, httpOnly: true });
      return next();
    } catch (err) {
      // Fail-safe: continue on timeout so legitimate visitors are never stuck
      return next();
    }
  };
}

module.exports = cleanTrafficMiddleware;