FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    kannel \
    kannel-extras \
    libssl3 \
    wget \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/log/kannel /var/spool/kannel /etc/kannel

COPY infra/kannel/kannel.conf /etc/kannel/kannel.conf
COPY infra/kannel/entrypoint.sh /etc/kannel/entrypoint.sh
RUN chmod +x /etc/kannel/entrypoint.sh

EXPOSE 13000 13001 13013

CMD ["/etc/kannel/entrypoint.sh"]
