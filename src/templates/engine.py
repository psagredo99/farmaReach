from jinja2 import Template

DEFAULT_TEMPLATE = """Hola {{ nombre }},

Soy {{ remitente }} y te contacto porque trabajamos con farmacias de la zona de {{ zona }} para mejorar {{ propuesta_valor }}.

Si te interesa, te comparto una propuesta breve adaptada a {{ nombre }}.

Un saludo,
{{ remitente }}
{{ firma }}
"""


def render_email(template_text: str, context: dict) -> str:
    text = template_text.strip() if template_text.strip() else DEFAULT_TEMPLATE
    return Template(text).render(**context)
