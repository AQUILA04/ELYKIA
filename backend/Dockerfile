FROM eclipse-temurin:17-jre

# Non-Alpine (glibc) required: Vertex AI / gRPC loads netty-tcnative which SIGSEGVs on musl/Alpine.
# Create a dedicated non-root user with a proper home directory
RUN groupadd --system app && useradd --system --gid app --home-dir /home/app --create-home app

WORKDIR /app

COPY target/optimize-elykia-core-*.jar app.jar

# Create the required directories and give ownership to the app user
RUN mkdir -p /home/app/.optimize-elykia-core/logs \
    && mkdir -p /home/app/.optimize-elykia-core/operations \
    && chown -R app:app /home/app \
    && chown -R app:app /app

USER app

EXPOSE 8080

# Disable netty native SSL/transport as a safety net if a musl base is ever reintroduced
ENV JAVA_TOOL_OPTIONS="-Dio.grpc.netty.shaded.io.netty.handler.ssl.noOpenSsl=true -Dio.grpc.netty.shaded.io.netty.transport.noNative=true"

ENTRYPOINT ["java", "-jar", "app.jar"]
