# Standard Official Python Base Image from Docker Hub
FROM python:3.11-slim-bookworm

# Avoid prompts from debconf
ENV DEBIAN_FRONTEND=noninteractive

# Install essential system utilities and tools needed for IDE remote server & PDF pipeline
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget \
        ca-certificates \
        curl \
        git \
        procps \
        tar \
        gzip \
        sudo \
        poppler-utils \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Create non-root developer user with sudo privileges
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Upgrade pip and install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        Pillow>=10.0.0 \
        ruff>=0.4.0 \
        pytest>=8.0.0 \
        gunicorn>=21.2.0

USER $USERNAME
