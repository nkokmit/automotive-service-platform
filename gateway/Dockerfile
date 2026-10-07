# =====================================================
# Multi-stage Dockerfile cho Spring Cloud Gateway
# =====================================================

# ---------- Stage 1: Build ----------
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# ---------- Stage 2: Runtime ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy jar từ stage 1 (Maven output ra /build/target/)
COPY --from=builder /build/target/gateway.jar /app/gateway.jar

# Copy OpenAPI specs (optional, để frontend có thể fetch /contracts/*.yaml)
COPY --from=builder /build/src/main/resources /app/resources

# Tạo user non-root
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENV SPRING_PROFILES_ACTIVE=dev

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/healthz || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar gateway.jar"]