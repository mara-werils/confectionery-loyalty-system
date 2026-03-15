#!/bin/bash

# Полный скрипт запуска проекта с туннелем
# Использование: ./scripts/start-with-tunnel.sh

set -e

echo "🎯 Запуск проекта с Cloudflare Tunnel"
echo ""

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose не установлен!"
    exit 1
fi

# Проверяем cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared не установлен!"
    echo ""
    echo "Установите cloudflared:"
    echo "  macOS: brew install cloudflared"
    exit 1
fi

# Шаг 1: Запускаем Docker Compose
echo "📦 Шаг 1: Запуск Docker Compose..."
docker-compose up -d

echo "⏳ Ожидание готовности сервисов..."
sleep 10

# Проверяем статус
if ! docker ps | grep -q "loyalty-frontend"; then
    echo "❌ Frontend не запустился!"
    docker-compose logs frontend
    exit 1
fi

if ! docker ps | grep -q "loyalty-backend"; then
    echo "❌ Backend не запустился!"
    docker-compose logs backend
    exit 1
fi

echo "✅ Сервисы запущены"
echo ""

# Шаг 2: Запускаем туннели
echo "🌐 Шаг 2: Запуск Cloudflare Tunnel..."
echo ""

# Запускаем туннель для Frontend
echo "🔗 Запуск туннеля для Frontend (порт 5173)..."
cloudflared tunnel --url http://localhost:5173 > .tunnel-frontend.log 2>&1 &
FRONTEND_PID=$!

# Запускаем туннель для Backend
echo "🔗 Запуск туннеля для Backend (порт 3001)..."
cloudflared tunnel --url http://localhost:3001 > .tunnel-backend.log 2>&1 &
BACKEND_PID=$!

# Сохраняем PID
echo "$FRONTEND_PID $BACKEND_PID" > .tunnel.pids

# Ждем запуска туннелей
echo "⏳ Ожидание запуска туннелей..."
sleep 8

# Извлекаем URL из логов (пробуем разные форматы)
FRONTEND_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' .tunnel-frontend.log 2>/dev/null | head -1 || echo "")
if [ -z "$FRONTEND_URL" ]; then
    FRONTEND_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' .tunnel-frontend.log 2>/dev/null | tail -1 || echo "")
fi

BACKEND_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' .tunnel-backend.log 2>/dev/null | head -1 || echo "")
if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' .tunnel-backend.log 2>/dev/null | tail -1 || echo "")
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ ПРОЕКТ ЗАПУЩЕН!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📱 Frontend (Telegram Mini App):"
if [ -n "$FRONTEND_URL" ]; then
    echo "   URL: $FRONTEND_URL"
else
    echo "   Проверьте логи: cat .tunnel-frontend.log"
fi
echo ""
echo "🔧 Backend API:"
if [ -n "$BACKEND_URL" ]; then
    echo "   URL: $BACKEND_URL"
else
    echo "   Проверьте логи: cat .tunnel-backend.log"
fi
echo ""
echo "📋 Следующие шаги:"
echo "   1. Скопируйте Frontend URL выше"
echo "   2. Откройте @BotFather в Telegram"
echo "   3. Выберите вашего бота"
echo "   4. Отправьте команду: /newapp"
echo "   5. Вставьте Frontend URL в поле 'Mini App URL'"
echo ""
echo "💡 Для остановки: ./scripts/tunnel-stop.sh"
echo "💡 Для просмотра логов: docker-compose logs -f"
echo ""
echo "═══════════════════════════════════════════════════════════"

# Ожидаем сигнала для остановки
trap "echo ''; echo '🛑 Остановка...'; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; rm -f .tunnel.pids; docker-compose down; exit" INT TERM

echo ""
echo "⏳ Туннели работают... (Ctrl+C для остановки)"
wait

