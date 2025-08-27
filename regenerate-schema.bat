@echo off
cd /d "c:\Proyectos\megui\erp\erp-pesquera-backend"
echo Regenerando schema.prisma desde la base de datos...
npx prisma db pull --force
echo.
echo Schema regenerado! Generando cliente Prisma...
npx prisma generate
echo.
echo Proceso completado exitosamente!
pause
