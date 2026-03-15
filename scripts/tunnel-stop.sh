#!/bin/bash

# Скрипт для остановки Cloudflare Tunnel
# Использование: ./scripts/tunnel-stop.sh

if [ -f .tunnel.pids ]; then
    PIDS=$(cat .tunnel.pids)
    echo "🛑 Останавливаю туннели (PID: $PIDS)..."
    kill $PIDS 2>/dev/null || true
    rm .tunnel.pids
    echo "✅ Туннели остановлены"
else
    echo "⚠️  Файл .tunnel.pids не найден"
    echo "Попытка найти и остановить процессы cloudflared..."
    pkill cloudflared 2>/dev/null || true
    echo "✅ Процессы cloudflared остановлены"
fi






