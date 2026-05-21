FROM osrm/osrm-backend:latest

# Install wget for downloading OSM data
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /data

# Entrypoint script that downloads, extracts, and starts OSRM
COPY infra/osrm/startup.sh /startup.sh
RUN chmod +x /startup.sh

ENTRYPOINT ["/startup.sh"]
