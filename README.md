# JAC Music · Agent Workspace

Una primera versión de la oficina de agentes de JAC Music, centrada en el flujo de itinerarios que DOT y Luisa alimentan desde **#itinerarios** en Slack.

## Qué puedes hacer

- Seleccionar un agente en la oficina visual y asignarle una tarea.
- Ejecutar varias tareas: hasta tres agentes trabajan en paralelo; cada agente procesa su cola en orden.
- Iniciar flujos para preparar, actualizar o revisar un itinerario. Cada paso recibe el brief original y todos los resultados anteriores.
- Consultar, cancelar, copiar y descargar tareas y borradores.
- Personalizar las instrucciones de cada agente y las reglas de DOT.
- Importar mensajes de un canal de Slack y revisar el brief antes de iniciar un flujo.

El equipo inicial incluye DOT (dirección), Atlas (itinerarios), Vera (logística), Tempo (agenda) y Nia (revisión). Luisa aparece como colaboradora humana de referencia; esta versión no crea una cuenta para ella ni simula su aprobación.

## Iniciar en el entorno en la nube

Requisitos: **Node.js 24** y npm 11. Usa el checkout existente en `/workspace/agente-ia`; cada tarea en la nube ya está aislada y no necesita un Git worktree.

```bash
cd /workspace/agente-ia
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev
```

Vite sirve la interfaz en el puerto **5173** y redirige `/api` al servidor en el puerto **3001**. La oficina funciona sin credenciales en un **modo de demostración explícito**, con plantillas locales; ese modo no analiza itinerarios con IA ni consulta Slack.

Los procesos deben iniciarse de nuevo al restaurar una máquina. Para una comprobación interna, solicita `/api/health` en el puerto 5173: devuelve `ok: true` y el modo de ejecución. No se deben presentar direcciones de loopback como enlaces de previsualización en la interfaz de onboarding.

```bash
npm run build
npm start
```

El comando de producción sirve la interfaz compilada y la API juntas en el puerto 3001.

## Publicar la app completa en Render

GitHub se usa como repositorio del código; **Render aloja la interfaz y el servidor**. La configuración está en `render.yaml` y utiliza Node.js 24.19.0. No necesitas GitHub Pages.

La instalación de Render usa `npm ci --include=dev` para conservar TypeScript y Vite durante la compilación, incluso con `NODE_ENV=production`. Estas herramientas se necesitan para generar la interfaz antes de arrancar el servidor.

El archivo `.npmrc` también incluye las dependencias de desarrollo, de modo que un servicio que aún conserve el comando anterior `npm ci` pueda compilar. Si un despliegue falla con `TS2688` para `node` o `vite/client`, comprueba que Render esté desplegando el commit más reciente de `main`. En los ajustes del servicio, el **Build Command** debe ser `npm ci --include=dev --no-audit --no-fund && npm test && npm run build`; vuelve a desplegar con la caché de compilación limpia si se conservó una instalación anterior.

1. Abre [Desplegar en Render](https://render.com/deploy?repo=https://github.com/camiloidarraga98/agente-ia).
2. Entra o crea una cuenta en Render y conecta GitHub, concediendo acceso al repositorio `camiloidarraga98/agente-ia`.
3. Revisa el servicio `jac-music-workspace` y despliega el blueprint. El plan inicial es **free** y la aplicación arranca en modo demo.
4. Cuando Render indique que el servicio está activo, utiliza la URL HTTPS que aparezca en su panel. Ese enlace es el de la aplicación; el botón de despliegue anterior solo abre la configuración.
5. En **Environment** del servicio, consulta de forma privada el valor generado de **JAC_ACCESS_PASSWORD**, o cámbialo por una contraseña de al menos 16 caracteres. Usa esa contraseña en la pantalla de acceso. No la publiques en el chat ni el repositorio.

El servidor rechaza arrancar con `NODE_ENV=production` si falta la contraseña o es demasiado corta. Las sesiones caducan tras ocho horas y al reiniciar el servidor. Las cookies de producción usan `HttpOnly`, `SameSite=Strict` y `Secure`; cerrar sesión revoca el acceso de esa sesión. Las rutas de datos requieren autenticación; `/api/health` permanece disponible para Render.

**El plan gratuito usa almacenamiento temporal:** tareas, instrucciones y resultados pueden perderse al reiniciar o desplegar. Sirve para probar la oficina. Para conservar itinerarios reales, selecciona una instancia con disco persistente, monta el disco, por ejemplo en `/var/data`, y configura **JAC_DATA_DIR=/var/data/jac** antes de empezar a guardar información. El blueprint gratuito no crea discos ni contrata un plan de pago automáticamente.

Después puedes añadir **JAC_OPENAI_API_KEY** y **JAC_SLACK_BOT_TOKEN** en el panel seguro de Render y redeployar el servicio. Los secretos de este entorno de desarrollo no se copian automáticamente a Render.

La configuración preparada no constituye un despliegue activo: es necesario conectar una cuenta de Render y comprobar la URL del servicio una vez publicado.

## Conectar DOT a través de OpenAI

1. Añade **JAC_OPENAI_API_KEY** de forma segura en las variables del entorno. También se admite una variable `OPENAI_API_KEY` ya existente. No escribas claves en el repositorio, el chat ni el navegador.
2. Permite solicitudes HTTPS a **api.openai.com** en la configuración de red.
3. Reinicia `npm run dev` o `npm start`.
4. En **Conexiones**, pega las instrucciones y preferencias de tu DOT y guarda la configuración.
5. Asigna una tarea pequeña y verifica su resultado: la presencia de una clave por sí sola no prueba que la autenticación y la cuota funcionen.

La API usa `gpt-4.1-mini` por defecto; puedes seleccionar otro modelo disponible mediante `JAC_MODEL`. Las peticiones usan Responses API con `store: false` y mantienen la verificación TLS y el proxy del entorno.

Una cuenta o GPT personalizado de ChatGPT no ofrece aquí una conexión automática a su historial, archivos, memoria ni herramientas. Esta versión reutiliza las instrucciones que tú aportes y ejecuta los agentes mediante una clave de API, cuyo uso se factura por separado.

## Conectar Slack · #itinerarios

1. Crea o utiliza una aplicación de Slack con el permiso de lectura **channels:history**. Para un canal privado, usa **groups:history**.
2. Instala la aplicación en el workspace y añádela a **#itinerarios**.
3. Configura su credencial de bot de forma segura como **JAC_SLACK_BOT_TOKEN**. Permite solicitudes HTTPS a **slack.com**.
4. Reinicia el servidor.
5. Abre los detalles del canal en Slack, copia su **ID** (empieza por `C` o `G`) y guárdalo en **Conexiones**. El nombre del canal no sustituye su ID.
6. Pulsa **Importar mensajes**. Revisa el texto y luego inicia el flujo.

La primera versión importa hasta **50 mensajes recientes** del canal, en orden cronológico, limitando el brief a 12000 caracteres. No importa respuestas dentro de hilos ni sincroniza en segundo plano. No publica mensajes, modifica reservas ni ejecuta acciones externas. También puedes pegar los mensajes o el itinerario directamente en el brief sin conectar Slack.

## Persistencia y límites de esta versión

Los datos se conservan en `.data/workspace.json` (o en `JAC_DATA_DIR`), con escritura atómica. Las credenciales permanecen en el entorno y no se guardan en este archivo. Conserva ese directorio cuando quieras conservar las tareas. No borres archivos de usuario para reiniciar una demo.

Las tareas que se interrumpen al reiniciar el servidor quedan marcadas como fallidas. No se repiten peticiones automáticamente, para evitar solicitudes duplicadas al proveedor. La cancelación detiene el flujo antes de crear pasos posteriores.

Es un prototipo con acceso mediante una contraseña compartida del estudio; todavía no incluye cuentas individuales, permisos por usuario, sincronización en tiempo real con Slack, lectura de hilos ni reservas reales. Los resultados siempre son borradores para revisión humana. La conexión con servicios externos se debe validar con credenciales reales antes de considerarla operativa.

## Validación

```bash
npm test
npm run build
npm run test:e2e
```

Las trece pruebas de servidor cubren persistencia, ejecución paralela, contexto entre pasos, cancelación, reinicios, errores del proveedor, importación de Slack, validación de la API y acceso protegido. OpenAI y Slack usan respuestas simuladas en esas pruebas, sin llamadas reales ni publicación de mensajes.

Las seis pruebas de navegador usan la interfaz compilada y servidores de prueba en modo demo: asignación de tareas, descarga de borradores, flujos completos, configuración, navegación móvil y login/logout. Requieren Chromium (`/usr/bin/chromium` en este entorno); para otra ubicación, configura `JAC_CHROMIUM_PATH`. Ejecuta `npm run build` antes de las pruebas de navegador si has cambiado la interfaz.
