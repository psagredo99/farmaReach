import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

from src.config import GMAIL_ADDRESS, GMAIL_APP_PASSWORD


def send_gmail(destinatario: str, asunto: str, cuerpo: str, remitente_nombre: str = "") -> tuple[bool, str]:
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        return False, "Configura GMAIL_ADDRESS y GMAIL_APP_PASSWORD"

    msg = MIMEText(cuerpo, "plain", "utf-8")
    msg["Subject"] = asunto
    msg["From"] = formataddr((remitente_nombre, GMAIL_ADDRESS)) if remitente_nombre else GMAIL_ADDRESS
    msg["To"] = destinatario

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, [destinatario], msg.as_string())
        return True, "OK"
    except Exception as ex:
        return False, str(ex)
