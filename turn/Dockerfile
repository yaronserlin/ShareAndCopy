FROM coturn/coturn:4.6-alpine

USER root
RUN apk add --no-cache wget

COPY start-turn.sh /usr/local/bin/start-turn.sh
RUN chmod +x /usr/local/bin/start-turn.sh

USER turnserver
ENTRYPOINT ["/usr/local/bin/start-turn.sh"]
