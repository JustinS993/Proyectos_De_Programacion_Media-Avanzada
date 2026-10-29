@echo off
setlocal
set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 9.5\bin\mysqld.exe"
set "CFG=C:\Users\JUSTIN SEBASTIAN\Desktop\1\Proyectos_De_Programacion_Media-Avanzada\15-base-datos-simple\mysql-custom.ini"

"%MYSQL_BIN%" --defaults-file="%CFG%" --console
