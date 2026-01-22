@echo off
echo ========================================
echo Nettoyage complet et redémarrage
echo ========================================

echo 1. Nettoyage Maven...
call mvnw.cmd clean

echo 2. Compilation...
call mvnw.cmd compile

echo 3. Nettoyage Flyway et redémarrage...
echo ATTENTION: Cela va supprimer toutes les données de la base !
pause

call mvnw.cmd flyway:clean -Dspring.profiles.active=jeff
call mvnw.cmd spring-boot:run -Dspring.profiles.active=jeff

pause