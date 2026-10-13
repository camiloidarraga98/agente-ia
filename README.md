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

Si quieres trabajar con la suscripción de ChatGPT, usa el modo descrito en la sección siguiente. La conexión de API de esta sección es independiente y no utiliza esa suscripción.

1. Añade **JAC_OPENAI_API_KEY** de forma segura en las variables del entorno. También se admite una variable `OPENAI_API_KEY` ya existente. No escribas claves en el repositorio, el chat ni el navegador.
2. Permite solicitudes HTTPS a **api.openai.com** en la configuración de red.
3. Reinicia `npm run dev` o `npm start`.
4. En **Conexiones**, pega las instrucciones y preferencias de tu DOT y guarda la configuración.
5. Asigna una tarea pequeña y verifica su resultado: la presencia de una clave por sí sola no prueba que la autenticación y la cuota funcionen.

La API usa `gpt-4.1-mini` por defecto; puedes seleccionar otro modelo disponible mediante `JAC_MODEL`. Las peticiones usan Responses API con `store: false` y mantienen la verificación TLS y el proxy del entorno.

Una cuenta o GPT personalizado de ChatGPT no ofrece aquí una conexión automática a su historial, archivos, memoria ni herramientas. Esta versión reutiliza las instrucciones que tú aportes y ejecuta los agentes mediante una clave de API, cuyo uso se factura por separado.

## Probar con DOT dentro de ChatGPT

Este modo utiliza tu conversación con DOT en ChatGPT. La oficina registra pedidos y borradores, pero **no invoca la API de OpenAI para las tareas de ChatGPT**, incluso si existe una clave de API configurada. Se aplican los límites y capacidades de tu plan de ChatGPT. Los agentes representan roles e instrucciones; el trabajo comienza cuando tú se lo pides a DOT, sin procesos de IA en segundo plano.

### Primera prueba: copiar y pegar

1. En **Conexiones**, pulsa **Usar mi ChatGPT**, o selecciona **Con mi DOT en ChatGPT** al crear una tarea.
2. Asigna a Atlas una tarea pequeña, por ejemplo: «Organiza un ensayo a las 15:00 y un show a las 20:00 en Bogotá. El traslado aún no está confirmado. Indica qué debe revisar Luisa».
3. La tarea queda en **Espera a DOT**. Pulsa **Copiar pedido para DOT** y pega el pedido en tu conversación con DOT.
4. Pega el borrador que recibas en **Respuesta de DOT** y pulsa **Guardar respuesta**. La tarea queda completada y muestra **Pegado por ti**; la aplicación no verifica por sí sola qué modelo generó el texto pegado.

Los flujos también funcionan así: cada respuesta crea el siguiente paso, que espera a ChatGPT y recibe el contexto anterior. El modo del flujo se conserva aunque cambies después la configuración general. Guardar dos veces la misma respuesta no crea pasos duplicados; las respuestas terminadas no se sobrescriben y las tareas canceladas no pueden completarse. Las tareas pendientes se conservan si se conserva el directorio de datos; el plan gratuito de Render sigue teniendo almacenamiento temporal.

### Conexión opcional: acciones de un GPT editable

Esta conexión requiere que DOT sea un **GPT personalizado que puedas editar**. Una conversación o proyecto normal puede usar la prueba manual, pero no ofrece el mismo editor de acciones.

1. Sincroniza el blueprint de Render actualizado. Incluye la variable **JAC_GPT_ACTIONS_KEY**, con un valor generado que permanece únicamente en el hosting; debe tener al menos 32 caracteres y ser distinto de la contraseña de la oficina.
2. Abre **Conexiones → Conectar las acciones de DOT**. Descarga el esquema o copia su URL. En Render la URL se obtiene de `RENDER_EXTERNAL_URL`; fuera de Render, configura `PUBLIC_ORIGIN` con el origen HTTPS del servicio.
3. En ChatGPT abre **Mis GPTs**, elige **Editar** en DOT y entra en **Configurar → Crear nueva acción**.
4. Importa el esquema y configura autenticación **API Key → Bearer**. Copia el valor de `JAC_GPT_ACTIONS_KEY` del panel seguro de Render a la configuración de autenticación de la acción. No uses tu contraseña de la oficina, no pegues la clave en el chat ni en las instrucciones del GPT.
5. Añade las instrucciones que muestra la oficina al final de las instrucciones actuales de DOT. Conserva las reglas que ya tiene y guarda el GPT.
6. Crea una tarea para ChatGPT, copia su pedido y envíalo a DOT. Pídele que consulte el ID y guarde el borrador. ChatGPT puede solicitar confirmación para el acceso y el guardado.

Las acciones pueden leer el equipo, listar pendientes, leer una tarea, crear una tarea para ChatGPT y guardar su respuesta. No tienen acceso a los ajustes de la oficina, no llaman a modelos mediante API, no publican en Slack y no hacen reservas. Las rutas de acciones requieren su propia clave Bearer y no aceptan la cookie de entrada de la oficina como sustituto. El esquema OpenAPI es público y no contiene datos privados ni credenciales; las instrucciones personalizadas y los briefs requieren autenticación.

El texto recibido del GPT es un borrador para revisión humana. Las peticiones de guardado están marcadas como acciones con consecuencias en el esquema. El guardado recibido por esta ruta muestra **Acción de DOT**. Preparar y probar las rutas localmente no demuestra que el GPT esté conectado: confirma una lectura y un guardado reales desde ChatGPT antes de considerar activa la integración.

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

Las veinte pruebas de servidor cubren persistencia, ejecución paralela, contexto entre pasos, cancelación, reinicios, errores del proveedor, importación de Slack, validación de la API, acceso protegido y tareas/acciones de ChatGPT. Se verifica que las tareas de ChatGPT no invocan la API incluso con una clave configurada. OpenAI y Slack usan respuestas simuladas, sin llamadas reales ni publicación de mensajes.

Las ocho pruebas de navegador usan la interfaz compilada y servidores de prueba: asignación de tareas, descarga de borradores, flujos completos, configuración, navegación móvil, login/logout y el recorrido manual de ChatGPT. Requieren Chromium (`/usr/bin/chromium` en este entorno); para otra ubicación, configura `JAC_CHROMIUM_PATH`. Ejecuta `npm run build` antes de las pruebas de navegador si has cambiado la interfaz.
