@echo off
echo ========================================
echo Démarrage propre de l'application
echo ========================================

echo 1. Nettoyage du projet...
call mvnw.cmd clean

echo 2. Compilation...
call mvnw.cmd compile

echo 3. Démarrage avec Flyway clean et migrate...
call mvnw.cmd spring-boot:run -Dspring.profiles.active=jeff -Dflyway.cleanDisabled=false

pause