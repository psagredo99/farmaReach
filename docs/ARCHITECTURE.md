# Arquitectura Backend

## Capas

- `src/api`: endpoints HTTP y esquemas.
- `src/core`: configuracion, sesion DB y modelos ORM.
- `src/services`: casos de uso y conectores externos (collectors, mailer, templates).

## Nota

Se elimino la capa legacy de wrappers para mantener un arbol limpio y una sola ruta de imports.
