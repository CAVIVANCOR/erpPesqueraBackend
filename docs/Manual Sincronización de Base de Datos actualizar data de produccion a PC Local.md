Manual: Sincronización de Base de Datos de Producción a Local
Objetivo
Este manual describe el proceso completo para sincronizar la base de datos de producción del ERP Megui con tu base de datos local usando pgAdmin y NoMachine.

## ⚠️ REGLA DE ORO

**Antes de sincronizar datos de producción a local, asegúrate de que:**

1. ✅ Todas las migraciones de schema estén aplicadas en PRODUCCIÓN
2. ✅ Tu schema.prisma local esté sincronizado con producción
3. ✅ No tengas cambios de schema pendientes sin migrar

**Flujo correcto:**

Requisitos Previos
pgAdmin 4 instalado en tu PC local y en el servidor
NoMachine para acceso remoto al servidor
Acceso al servidor de producción (IP: 192.168.0.6 o 200.62.246.74)
PostgreSQL 17 instalado en ambos entornos
Credenciales de acceso (usuario: cavivancor)
Parte 1: Crear Backup en el Servidor de Producción
Paso 1.1: Conectarse al servidor
Abre NoMachine
Conéctate al servidor de producción (192.168.0.6)
Abre pgAdmin 4 en el servidor
Paso 1.2: Crear el backup
En pgAdmin, navega a: Servers → PostgreSQL 17 → Databases
Clic derecho en erp_pesquera → Backup...
Paso 1.3: Configurar opciones del backup
Pestaña General:

Filename: /home/cavivancor/backups/backup20251228_bd
Format: Custom
Encoding: UTF8
Compression ratio: (opcional) 6 o 9 para comprimir
Pestaña Data Options:

Activa los siguientes toggles (círculo azul a la derecha):

✅ Pre-data: ON
✅ Data: ON
✅ Post-data: ON
✅ Blobs: ON
Los demás déjalos desactivados (círculo blanco a la izquierda).

![Configuración Data Options](imagen mostrando toggles activados)

Paso 1.4: Ejecutar el backup
Clic en el botón azul "Backup"
Espera a que termine el proceso
Verás un mensaje de éxito en la pestaña Processes
![Backup completado](imagen mostrando proceso finalizado)

Parte 2: Transferir el Archivo a tu PC Local
Paso 2.1: Habilitar compartir dispositivos en NoMachine
En la ventana de NoMachine, haz clic en el ícono de configuración (engranaje)
Ve a Dispositivos → Discos, impresoras, USB, lectores de tarjetas inteligentes
Verifica que "Compartir los dispositivos de este servidor" esté marcado
Asegúrate de que "Discos" esté marcado ✅
Clic en Aplicar o OK
![Configuración de dispositivos NoMachine](imagen de configuración)

Paso 2.2: Copiar el archivo
Desde el servidor (dentro de NoMachine):

Abre el Explorador de archivos (File Manager)
Navega a: /home/cavivancor/backups/
Encuentra el archivo backup20251228_bd
Copia el archivo (Ctrl+C)
En tu PC local:

Abre el Explorador de Windows
Crea una carpeta: C:\backups\
Dentro de la sesión de NoMachine, busca los discos compartidos
Navega a tu disco local C:\backups\
Pega el archivo (Ctrl+V)
Nota: El archivo no tendrá extensión, esto es normal. pgAdmin lo reconocerá automáticamente.

![Archivo sin extensión](imagen mostrando archivo backup20251228_bd)

Parte 3: Preparar Base de Datos Local
Paso 3.1: Identificar tus bases de datos
Abre pgAdmin 4 en tu PC local y verifica tus bases de datos existentes:

PostgreSQL 17
└── Databases (4)
    ├── erp_pesquera    ← Esta la vamos a reemplazar
    ├── frankmylife     ← No tocar
    ├── postgres        ← No tocar
    └── tienda          ← No tocar
![Bases de datos locales](imagen mostrando lista de BDs)

Paso 3.2: Hacer backup de seguridad de tu BD local
IMPORTANTE: Antes de eliminar tu BD local, haz un backup por seguridad.

Clic derecho en erp_pesquera → Backup...
Configura:
Filename: C:\backups\erp_pesquera_local_backup_20251228.backup
Format: Custom
Encoding: UTF8
En Data Options:
✅ Pre-data: ON
✅ Data: ON
✅ Post-data: ON
✅ Blobs: ON
Clic en Backup
Espera a que termine
![Backup de seguridad completado](imagen mostrando proceso finalizado)

Paso 3.3: Cerrar conexiones activas
Antes de eliminar la BD, cierra tu aplicación ERP:

Cierra el navegador donde está el frontend
Detén el servidor backend (Ctrl+C en la terminal de VSCode)
En pgAdmin:

Clic derecho en erp_pesquera → Query Tool
Ejecuta este comando:
sql
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'erp_pesquera'
  AND pid <> pg_backend_pid();
Presiona F5 o clic en ▶️ (Execute)
Verás el resultado indicando cuántas conexiones se cerraron
![Conexiones cerradas](imagen mostrando resultado true)

Paso 3.4: Eliminar la BD local
Cierra la pestaña del Query Tool
Clic derecho en erp_pesquera → Drop
Confirma la eliminación
Verifica que erp_pesquera desapareció de la lista
Confirma que las otras BDs siguen intactas ✅
![Menú Drop](imagen mostrando opciones Drop y Drop Force)

Paso 3.5: Crear nueva BD vacía
Clic derecho en Databases (3) → Create → Database...
En la pestaña General:
Database: erp_pesquera
Owner: postgres
En la pestaña Definition:
Encoding: UTF8
Clic en Save
![Crear base de datos - General](imagen de configuración General) ![Crear base de datos - Definition](imagen de configuración Definition)

Deberías ver Databases (4) nuevamente con erp_pesquera vacía.

![BD creada](imagen mostrando erp_pesquera vacía con schemas)

Parte 4: Restaurar el Backup de Producción
Paso 4.1: Iniciar la restauración
Clic derecho en erp_pesquera (la nueva BD vacía) → Restore...
Paso 4.2: Configurar opciones de restauración
Pestaña General:

Filename: Haz clic en 📁 y selecciona C:\backups\backup20251228_bd
Format: Custom or tar
Role name: postgres
![Configuración General de Restore](imagen de configuración)

Pestaña Data Options:

Activa los siguientes toggles (círculo azul a la derecha):

✅ Pre-data: ON
✅ Data: ON
✅ Post-data: ON
Todo lo demás debe estar desactivado (OFF).

![Configuración Data Options de Restore](imagen de toggles)

Paso 4.3: Ejecutar la restauración
Clic en el botón azul "Restore"
Espera a que termine el proceso (puede tardar varios minutos)
Verás un mensaje de éxito en la pestaña Processes
![Restauración completada](imagen mostrando proceso finalizado con mensaje verde)

Parte 5: Verificar la Restauración
Paso 5.1: Refrescar la base de datos
En el panel izquierdo, clic derecho en erp_pesquera → Refresh (F5)
Expande: erp_pesquera → Schemas → public → Tables
Deberías ver todas las tablas del ERP
Paso 5.2: Verificar datos
Clic derecho en erp_pesquera → Query Tool
Ejecuta estas consultas:
sql
-- Ver cuántas empresas hay
SELECT COUNT(*) as total_empresas FROM "Empresa";
-- Ver cuántos registros de personal hay
SELECT COUNT(*) as total_personal FROM "Personal";
-- Ver las primeras empresas
SELECT * FROM "Empresa" LIMIT 5;
Si ves datos, ¡la sincronización fue exitosa! ✅

Paso 5.3: Regenerar cliente Prisma
Abre una terminal en tu proyecto backend:

bash
cd c:\Proyectos\megui\erp\erp-pesquera-backend
# Regenerar cliente Prisma
npx prisma generate
# Verificar que schema.prisma coincida con la BD
npx prisma db pull
Notas Importantes
⚠️ Advertencias
Backup de seguridad: Siempre haz backup de tu BD local antes de restaurar
Otras bases de datos: Este proceso solo afecta a erp_pesquera, no toca otras BDs
Conexiones activas: Cierra todas las aplicaciones que usen la BD antes de eliminarla
Datos sensibles: La BD de producción contiene datos reales de clientes
📋 Flujo para cambios de schema
Si vas a hacer cambios al schema después de sincronizar:

Desarrollo local:

bash
# 1. Modificas schema.prisma
# 2. Generas migración
npx prisma migrate dev --name descripcion_cambio
# 3. Pruebas localmente
# 4. Commit y push
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: descripcion del cambio"
git push
Producción:

bash
# En el servidor
cd /ruta/erp-pesquera-backend
git pull
npx prisma migrate deploy
npx prisma generate
pm2 restart erp-backend
🔄 Frecuencia recomendada
Sincronización completa: Cada vez que necesites datos actualizados de producción
Backups de seguridad: Antes de cada sincronización
Verificación: Después de cada restauración
Solución de Problemas
Error: "database is being accessed by other users"
Solución: Ejecuta el comando para cerrar conexiones (Paso 3.3)

Error: No puedo copiar archivos con NoMachine
Solución: Verifica que "Discos" esté habilitado en Dispositivos de NoMachine

El archivo no tiene extensión
Solución: Es normal. pgAdmin reconoce el formato automáticamente cuando seleccionas "Custom or tar"

Las tablas están vacías después de restaurar
Solución: Verifica que activaste "Data" en Data Options durante la restauración

Resumen del Proceso
✅ Crear backup en servidor de producción
✅ Transferir archivo a PC local vía NoMachine
✅ Hacer backup de seguridad de BD local
✅ Cerrar conexiones activas
✅ Eliminar BD local
✅ Crear nueva BD vacía
✅ Restaurar backup de producción
✅ Verificar datos
✅ Regenerar cliente Prisma
Tiempo estimado: 15-20 minutos

Documento creado: 28/12/2025
Versión: 1.0
Autor: ERP Megui - Documentación Técnica

Feedback submitted