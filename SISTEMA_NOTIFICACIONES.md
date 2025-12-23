# Sistema Híbrido de Notificaciones - ERP Megui

## 📋 Resumen

Sistema completo de notificaciones que combina:
- ✅ **Notificaciones In-App** (campana en el header)
- ✅ **Emails automáticos** (invitaciones, recordatorios)
- ✅ **Integración con Videoconferencias**

---

## 🗂️ Archivos Creados

### **Backend:**

1. **Base de Datos:**
   - `prisma/schema.prisma` - Modelo `Notificacion` y enum `TipoNotificacion` (YA MIGRADO)

2. **Servicios:**
   - `src/services/Notificacion/notificacion.service.js` - CRUD de notificaciones
   - `src/services/Email/email.service.js` - Envío de emails con Nodemailer

3. **Controladores:**
   - `src/controllers/Notificacion/notificacion.controller.js` - Endpoints de notificaciones

4. **Rutas:**
   - `src/routes/Notificacion/notificacion.routes.js` - Rutas de notificaciones
   - `src/routes/index.js` - Registro de rutas (ACTUALIZADO)

5. **Integración:**
   - `src/services/Videoconferencia/participanteReunion.service.js` - Envío automático al agregar participante

### **Frontend:**

1. **API:**
   - `src/api/notificacion.js` - Funciones para consumir API de notificaciones

2. **Store:**
   - `src/shared/stores/useNotificacionStore.js` - Estado global con Zustand

3. **Componentes:**
   - `src/components/layout/AppHeader/NotificationBell.jsx` - Campana de notificaciones
   - `src/components/layout/AppHeader/NotificationBell.css` - Estilos
   - `src/components/layout/AppHeader/index.jsx` - Header actualizado

---

## 🔧 Configuración Requerida

### **Variables de Entorno (.env)**

Agrega estas variables al archivo `.env` del backend:

```env
# ============================================
# CONFIGURACIÓN DE EMAIL (NODEMAILER)
# ============================================

# Servidor SMTP (Gmail, Outlook, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Credenciales de email
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion

# Nombre del remitente
SMTP_FROM_NAME=ERP Megui

# URL de Jitsi Meet
JITSI_URL=https://meet.megui.com.pe
```

### **⚠️ IMPORTANTE: Contraseña de Aplicación de Gmail**

Si usas Gmail, NO uses tu contraseña normal. Debes generar una "Contraseña de Aplicación":

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos (actívala si no está activa)
3. Contraseñas de aplicaciones
4. Genera una nueva contraseña para "Correo"
5. Copia esa contraseña de 16 caracteres a `SMTP_PASS`

---

## 📡 Endpoints Disponibles

### **Notificaciones:**

```
GET    /api/notificaciones                    - Obtener notificaciones del usuario
GET    /api/notificaciones/no-leidas/count    - Contar no leídas
PUT    /api/notificaciones/:id/leida          - Marcar como leída
PUT    /api/notificaciones/marcar-todas-leidas - Marcar todas como leídas
DELETE /api/notificaciones/:id                - Eliminar notificación
```

---

## 🎯 Flujo de Funcionamiento

### **1. Agregar Participante a Videoconferencia:**

Cuando se agrega un participante:

1. ✅ Se crea el registro en `ParticipanteReunion`
2. ✅ Se crea una notificación in-app (si el personal tiene usuario)
3. ✅ Se envía un email de invitación (si el personal tiene email)

### **2. Notificaciones In-App:**

- 🔔 Campana en el header muestra badge con contador
- 📋 Panel deslizante con lista de notificaciones
- 🔵 Notificaciones no leídas destacadas en azul
- ✅ Click en notificación la marca como leída y navega al destino
- 🗑️ Botón para eliminar notificaciones
- 👁️ Toggle para mostrar todas o solo no leídas
- ✔️ Botón para marcar todas como leídas
- 🔄 Polling automático cada 30 segundos

### **3. Emails:**

Templates HTML profesionales con:
- 📧 **Invitación:** Detalles de la reunión + botón "Unirse"
- ⏰ **Recordatorio:** Alerta antes de la reunión
- ❌ **Cancelación:** Notificación de cancelación

---

## 🧪 Instrucciones de Prueba

### **Paso 1: Configurar Variables de Entorno**

```bash
cd c:\Proyectos\megui\erp\erp-pesquera-backend
```

Edita el archivo `.env` y agrega las variables SMTP mencionadas arriba.

### **Paso 2: Instalar Dependencia de Nodemailer**

```bash
npm install nodemailer
```

### **Paso 3: Reiniciar Backend en Desarrollo**

```bash
npm run dev
```

### **Paso 4: Iniciar Frontend**

```bash
cd c:\Proyectos\megui\erp\erp-pesquera-frontend-web
npm run dev
```

### **Paso 5: Probar el Sistema**

1. **Verificar Campana de Notificaciones:**
   - Inicia sesión en el ERP
   - Verifica que aparezca la campana 🔔 en el header (entre Jitsi y tu avatar)

2. **Crear una Videoconferencia:**
   - Ve a Comunicaciones → Videoconferencias
   - Crea una nueva videoconferencia

3. **Agregar un Participante:**
   - Agrega un participante que tenga:
     - ✅ Usuario en el sistema (para notificación in-app)
     - ✅ Email registrado (para email)

4. **Verificar Notificación In-App:**
   - La campana debe mostrar un badge con "1"
   - Click en la campana para ver la notificación
   - Debe aparecer la invitación a la videoconferencia

5. **Verificar Email:**
   - Revisa la bandeja de entrada del email del participante
   - Debe llegar un email con el template HTML de invitación

6. **Probar Funcionalidades:**
   - ✅ Marcar notificación como leída
   - ✅ Eliminar notificación
   - ✅ Marcar todas como leídas
   - ✅ Toggle mostrar todas/solo no leídas
   - ✅ Click en notificación navega a la videoconferencia

---

## 🐛 Troubleshooting

### **Error: "Error al enviar email"**

**Causa:** Credenciales SMTP incorrectas o Gmail bloqueando el acceso.

**Solución:**
1. Verifica que `SMTP_USER` y `SMTP_PASS` sean correctos
2. Si usas Gmail, asegúrate de usar una "Contraseña de Aplicación"
3. Verifica que la verificación en 2 pasos esté activa en Gmail

### **Error: "Cannot find module 'nodemailer'"**

**Causa:** Nodemailer no está instalado.

**Solución:**
```bash
cd c:\Proyectos\megui\erp\erp-pesquera-backend
npm install nodemailer
```

### **La campana no aparece en el header**

**Causa:** El componente NotificationBell no se está renderizando.

**Solución:**
1. Verifica que el archivo `NotificationBell.jsx` exista
2. Verifica que esté importado en `AppHeader/index.jsx`
3. Revisa la consola del navegador por errores

### **No llegan notificaciones in-app**

**Causa:** El personal no tiene usuario asociado.

**Solución:**
1. Ve a Usuarios → Personal
2. Asegúrate de que el personal tenga un usuario creado
3. La relación `personal.usuario` debe existir

---

## 📦 Dependencias Nuevas

### **Backend:**
```json
{
  "nodemailer": "^6.9.0"
}
```

### **Frontend:**
```json
{
  "zustand": "^4.x.x" (ya instalado)
}
```

---

## 🚀 Despliegue a Producción

### **⚠️ IMPORTANTE: NO SUBIR HASTA PROBAR EN DESARROLLO**

Una vez que hayas probado todo en desarrollo y funcione correctamente:

### **1. Backend:**

```bash
cd c:\Proyectos\megui\erp\erp-pesquera-backend

# Instalar nodemailer
npm install nodemailer

# Commitear cambios
git add .
git commit -m "Implementar sistema híbrido de notificaciones (Email + In-App)"
git push origin main
```

### **2. Frontend:**

```bash
cd c:\Proyectos\megui\erp\erp-pesquera-frontend-web

# Commitear cambios
git add .
git commit -m "Implementar NotificationBell y store de notificaciones"
git push origin main
```

### **3. En el Servidor:**

```bash
# Conectarse al servidor
ssh cavivancor@200.62.246.74 -p 22888

# Actualizar Backend
cd /var/www/erp.megui.com.pe/backend
git pull
npm install  # Instala nodemailer
pm2 restart erp-backend

# Actualizar Frontend
cd /var/www/erp.megui.com.pe/frontend
git pull
npm install
npm run build

# Configurar variables de entorno
nano .env
# Agregar las variables SMTP
```

### **4. Configurar .env en Producción:**

Edita `/var/www/erp.megui.com.pe/backend/.env` y agrega:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email-produccion@gmail.com
SMTP_PASS=tu-contraseña-de-aplicacion-produccion
SMTP_FROM_NAME=ERP Megui
JITSI_URL=https://meet.megui.com.pe
```

---

## 📊 Tipos de Notificaciones Disponibles

```javascript
enum TipoNotificacion {
  VIDEOCONFERENCIA_INVITACION          // Invitación a videoconferencia
  VIDEOCONFERENCIA_RECORDATORIO_24H    // Recordatorio 24 horas antes
  VIDEOCONFERENCIA_1H                  // Recordatorio 1 hora antes
  VIDEOCONFERENCIA_INICIADA            // Reunión iniciada
  VIDEOCONFERENCIA_CANCELADA           // Reunión cancelada
  SISTEMA_GENERAL                      // Notificación general del sistema
  APROBACION_PENDIENTE                 // Aprobación pendiente
  DOCUMENTO_APROBADO                   // Documento aprobado
  DOCUMENTO_RECHAZADO                  // Documento rechazado
}
```

---

## ✅ Checklist de Implementación

- [x] Modelo Notificacion en Prisma
- [x] Migración aplicada en desarrollo
- [x] Servicio de notificaciones (backend)
- [x] Controlador de notificaciones (backend)
- [x] Rutas de notificaciones (backend)
- [x] Servicio de emails con Nodemailer (backend)
- [x] Templates HTML de emails (backend)
- [x] Integración en participanteReunion.service (backend)
- [x] API de notificaciones (frontend)
- [x] Store de notificaciones con Zustand (frontend)
- [x] Componente NotificationBell (frontend)
- [x] Integración en AppHeader (frontend)
- [ ] Configurar variables SMTP en .env
- [ ] Instalar nodemailer
- [ ] Probar en desarrollo
- [ ] Subir a producción

---

## 🎉 Próximas Mejoras (Opcional)

### **FASE 3: Dashboard "Mis Videoconferencias"**
- Vista de videoconferencias del usuario
- Filtros: Próximas, En curso, Finalizadas
- Botón "Unirse Ahora"

### **FASE 4: Recordatorios Automáticos**
- Cron job para recordatorios (1 día antes)
- Cron job para recordatorios (1 hora antes)

### **FASE 5: Calendario**
- Generación de archivos .ics
- Botón "Agregar a Calendario"
- Integración con Google Calendar/Outlook

---

**Desarrollado por:** Cascade AI  
**Fecha:** Diciembre 2025  
**Versión:** 1.0.0
