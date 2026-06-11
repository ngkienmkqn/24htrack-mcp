# 24htrack-mcp — MCP stdio server (Glama/registry health checks chạy image này
# không có API key: server vẫn start + trả lời introspection, tool call sẽ
# hướng dẫn lấy key)
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY index.js ./
COPY bin ./bin
COPY README.md ./

ENTRYPOINT ["node", "bin/cli.js"]
