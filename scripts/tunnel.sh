#!/bin/bash

# Скрипт для запуска Cloudflare Tunnel для локальной разработки
# Использование: ./scripts/tunnel.sh

set -e

echo "🚀 Запуск Cloudflare Tunnel для Telegram Mini App..."
echo ""

# Проверяем, установлен ли cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared не установлен!"
    echo ""
    echo "Установите cloudflared:"
    echo "  macOS: brew install cloudflared"
    echo "  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo "  Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Проверяем, запущены ли сервисы
if ! docker ps | grep -q "loyalty-frontend"; then
    echo "⚠️  Frontend не запущен. Запускаю Docker Compose..."
    docker-compose up -d
    echo "⏳ Ожидание запуска сервисов..."
    sleep 5
fi

echo "✅ Сервисы запущены"
echo ""
echo "🌐 Запускаю туннели для Frontend и Backend..."
echo ""
echo "📱 Frontend будет доступен по HTTPS URL (для Telegram Mini App)"
echo "🔧 Backend будет доступен по HTTPS URL (для API)"
echo ""
echo "⚠️  ВАЖНО: Скопируйте URL для Frontend и используйте его в Telegram Bot @BotFather"
echo "   Команда: /newapp -> выберите бота -> Mini App URL"
echo ""

# Запускаем туннель для Frontend (порт 5173)
echo "🔗 Frontend туннель:"
cloudflared tunnel --url http://localhost:5173 &
FRONTEND_PID=$!

# Запускаем туннель для Backend (порт 3001)
echo "🔗 Backend туннель:"
cloudflared tunnel --url http://localhost:3001 &
BACKEND_PID=$!

# Ждем немного, чтобы получить URL
sleep 3

echo ""
echo "✅ Туннели запущены!"
echo ""
echo "📋 PID процессов:"
echo "   Frontend: $FRONTEND_PID"
echo "   Backend: $BACKEND_PID"
echo ""
echo "💡 Для остановки туннелей используйте: kill $FRONTEND_PID $BACKEND_PID"
echo ""
echo "🔍 Проверьте логи выше для получения HTTPS URL"
echo "   Или откройте новый терминал и выполните: ps aux | grep cloudflared"
echo ""

# Сохраняем PID в файл для удобной остановки
echo "$FRONTEND_PID $BACKEND_PID" > .tunnel.pids

echo "⏳ Туннели работают... (Ctrl+C для остановки)"
wait






