FROM eclipse-temurin:21-jdk-jammy@sha256:9d8dcf999b0bce2453e913823595a5ff2a4e8e9e5d5241b45280d0ff069818ec AS java

FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d

ARG ANDROID_COMMAND_LINE_TOOLS_VERSION=15859902
ARG ANDROID_COMMAND_LINE_TOOLS_SHA256=4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583
ARG BUNDLETOOL_VERSION=1.18.3
ARG BUNDLETOOL_SHA256=a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    BUNDLETOOL_JAR=/opt/bundletool/bundletool.jar \
    CHROME_BIN=/usr/bin/chromium \
    JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH

COPY --from=java /opt/java/openjdk /opt/java/openjdk

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        chromium \
        curl \
        unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl --fail --location --silent --show-error \
        "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_COMMAND_LINE_TOOLS_VERSION}_latest.zip" \
        --output /tmp/android-command-line-tools.zip \
    && echo "${ANDROID_COMMAND_LINE_TOOLS_SHA256}  /tmp/android-command-line-tools.zip" | sha256sum --check --strict \
    && mkdir -p "${ANDROID_HOME}/cmdline-tools/latest" /tmp/android-command-line-tools \
    && unzip -q /tmp/android-command-line-tools.zip -d /tmp/android-command-line-tools \
    && mv /tmp/android-command-line-tools/cmdline-tools/* "${ANDROID_HOME}/cmdline-tools/latest/" \
    && rm -rf /tmp/android-command-line-tools /tmp/android-command-line-tools.zip

RUN mkdir -p "$(dirname "${BUNDLETOOL_JAR}")" \
    && curl --fail --location --silent --show-error \
        "https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/bundletool-all-${BUNDLETOOL_VERSION}.jar" \
        --output "${BUNDLETOOL_JAR}" \
    && echo "${BUNDLETOOL_SHA256}  ${BUNDLETOOL_JAR}" | sha256sum --check --strict

RUN yes | sdkmanager --licenses >/dev/null \
    && sdkmanager \
        "build-tools;35.0.0" \
        "platform-tools" \
        "platforms;android-36"

COPY --chmod=0755 docker/android/entrypoint.sh /usr/local/bin/osmgo-android-build

ENTRYPOINT ["osmgo-android-build"]
