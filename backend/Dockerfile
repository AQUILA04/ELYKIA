FROM eclipse-temurin:17-jre

# Non-Alpine (glibc) required: Vertex AI / gRPC loads netty-tcnative which SIGSEGVs on musl/Alpine.
# Pin UID/GID: useradd --system without -u used 100 on Alpine and 999 on Debian, which
# crash-loops Logback on bind-mounted /opt/elykia/{env}/logs after a CD image swap.
ARG APP_UID=999
ARG APP_GID=999
RUN groupadd --system --gid ${APP_GID} app \
    && useradd --system --uid ${APP_UID} --gid app --home-dir /home/app --create-home app

WORKDIR /app

COPY target/optimize-elykia-core-*.jar app.jar
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Create the required directories and give ownership to the app user
RUN mkdir -p /home/app/.optimize-elykia-core/logs \
    && mkdir -p /home/app/.optimize-elykia-core/operations \
    && chown -R app:app /home/app \
    && chown -R app:app /app \
    && chmod 755 /docker-entrypoint.sh

# Entrypoint starts as root to chown bind mounts, then drops to app. Do not set USER.
EXPOSE 8080

# Disable netty native SSL/transport as a safety net if a musl base is ever reintroduced
ENV JAVA_TOOL_OPTIONS="-Dio.grpc.netty.shaded.io.netty.handler.ssl.noOpenSsl=true -Dio.grpc.netty.shaded.io.netty.transport.noNative=true"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["java", "-jar", "app.jar"]
