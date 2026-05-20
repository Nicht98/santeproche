FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    kannel \
    kannel-extras \
    libssl3 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/log/kannel /var/spool/kannel /etc/kannel

COPY infra/kannel/kannel.conf /etc/kannel/kannel.conf

EXPOSE 13000 13001 13013

CMD bearerbox /etc/kannel/kannel.conf & sleep 2 && smsbox /etc/kannel/kannel.conf & wait
