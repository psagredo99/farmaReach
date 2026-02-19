# Arquitectura Backend

## Capas

- `src/api`: endpoints HTTP y contratos.
- `src/core`: configuracion, sesion DB y modelos ORM.
- `src/services`: casos de uso y conectores externos (collectors, mailer, templates).

## Compatibilidad

Para no romper imports existentes, se mantienen wrappers en:
- `src/config.py`
- `src/db.py`
- `src/models.py`
- `src/lead_service.py`
- `src/collectors/*`
- `src/mailer/gmail_sender.py`
- `src/templates/engine.py`

Estos wrappers reexportan las implementaciones nuevas.
