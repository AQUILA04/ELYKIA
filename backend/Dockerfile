FROM eclipse-temurin:25-jre

# Non-Alpine (glibc) required: Vertex AI / gRPC loads netty-tcnative which SIGSEGVs on musl/Alpine.
# Pin UID/GID: useradd --system without -u used 100 on Alpine and 999 on Debian, which
# crash-loops Logback on bind-mounted /opt/elykia/{env}/logs after a CD image swap.
ARG APP_UID=999
ARG APP_GID=999
RUN groupadd --system --gid ${APP_GID} app \
    && useradd --system --uid ${APP_UID} --gid app --home-dir /home/app --create-home app

# Tesseract CLI for payment-proof OCR (Mixx / Moov receipts). Languages: French + English.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Disable netty native SSL/transport as a safety net if a musl base is ever reintroduced
ENV JAVA_TOOL_OPTIONS="-Dio.grpc.netty.shaded.io.netty.handler.ssl.noOpenSsl=true -Dio.grpc.netty.shaded.io.netty.transport.noNative=true"

COPY target/optimize-elykia-core-*.jar /tmp/app.jar
COPY docker-entrypoint.sh /docker-entrypoint.sh

# 1) Extract nested Spring Boot fat JAR (jarmode=tools) into /app (app.jar + lib/)
# 2) Pre-train Java 25 Project Leyden AOT cache (Spring + Hibernate + Envers + Tomcat) without a live DB
# 3) Create runtime directories and set ownership for user app
RUN java -Djarmode=tools -jar /tmp/app.jar extract --destination /app \
    && rm -f /tmp/app.jar \
    && java -XX:AOTCacheOutput=/app/app.aot \
        -Dspring.context.exit=onRefresh \
        -Dspring.profiles.active=prod \
        -Dspring.flyway.enabled=false \
        -Dspring.jpa.hibernate.ddl-auto=none \
        -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
        -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect \
        -Dspring.datasource.url=jdbc:postgresql://127.0.0.1:1/aot_dummy \
        -Dspring.datasource.username=aot \
        -Dspring.datasource.password=aot \
        -Dspring.datasource.hikari.initialization-fail-timeout=-1 \
        -Dspring.datasource.hikari.minimum-idle=0 \
        -Dapp.security.parameter.init-enabled=false \
        -Doptimize.notification.hub.enabled=false \
        -Delykia.ai.enabled=false \
        -Dbezkoder.app.jwtSecret=aot-training-secret-key-at-least-64-characters-long-for-hs512-validation \
        -Dminio.access-key=aot \
        -Dminio.secret-key=aot \
        -jar /app/app.jar \
    && mkdir -p /home/app/.optimize-elykia-core/logs \
    && mkdir -p /home/app/.optimize-elykia-core/operations \
    && chown -R app:app /home/app \
    && chown -R app:app /app \
    && chmod 755 /docker-entrypoint.sh

# Entrypoint starts as root to chown bind mounts, then drops to app. Do not set USER.
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["java", "-XX:AOTCache=/app/app.aot", "-jar", "/app/app.jar"]
