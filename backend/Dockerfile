# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Each module has its own POM (there is no root Maven aggregator).
ARG MODULE_PATH
COPY ${MODULE_PATH}/pom.xml ./pom.xml
COPY ${MODULE_PATH}/src ./src
RUN --mount=type=cache,id=automotive-maven,target=/root/.m2,sharing=locked \
    mvn -B -ntp clean package -DskipTests \
    && cp target/*.jar /build/application.jar

FROM eclipse-temurin:21-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app
WORKDIR /app
COPY --from=build --chown=app:app /build/application.jar ./application.jar
USER app
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
