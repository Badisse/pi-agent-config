FROM node:22-bookworm

# Install Pi globally
RUN npm install -g @mariozechner/pi-coding-agent

# Install gh CLI for GitHub issue integration
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh git \
    && rm -rf /var/lib/apt/lists/*

# Install jq for JSON parsing
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Entrypoint is pi
ENTRYPOINT ["pi"]
