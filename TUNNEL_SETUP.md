# 🌐 Настройка Cloudflare Tunnel для локальной разработки

Этот гайд поможет вам запустить проект локально с доступом через HTTPS для Telegram Mini App.

## 📋 Требования

1. **Docker** и **Docker Compose** установлены и запущены
2. **cloudflared** установлен:
   ```bash
   # macOS
   brew install cloudflared
   
   # Linux
   # Скачайте с https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   ```

## 🚀 Быстрый запуск

### Вариант 1: Автоматический запуск (рекомендуется)

```bash
./scripts/start-with-tunnel.sh
```

Этот скрипт:
- ✅ Запустит Docker Compose
- ✅ Запустит Cloudflare Tunnel для Frontend и Backend
- ✅ Покажет вам HTTPS URL для использования в Telegram

### Вариант 2: Ручной запуск

#### Шаг 1: Запустите Docker Compose

```bash
docker-compose up -d
```

Проверьте, что все сервисы запущены:
```bash
docker-compose ps
```

#### Шаг 2: Запустите туннели

В **отдельном терминале** запустите туннель для Frontend:
```bash
cloudflared tunnel --url http://localhost:5173
```

В **еще одном терминале** запустите туннель для Backend:
```bash
cloudflared tunnel --url http://localhost:3001
```

#### Шаг 3: Скопируйте URL

После запуска туннелей вы увидите что-то вроде:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://random-name.trycloudflare.com                                                    |
+--------------------------------------------------------------------------------------------+
```

**Скопируйте URL для Frontend** - он понадобится для Telegram Mini App.

## 📱 Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Выберите вашего бота (или создайте нового: `/newbot`)
3. Отправьте команду: `/newapp`
4. Выберите вашего бота из списка
5. В поле **"Mini App URL"** вставьте URL от Frontend туннеля (например: `https://random-name.trycloudflare.com`)
6. Сохраните изменения

## 🔧 Настройка Backend URL (опционально)

Если вы хотите использовать Backend через туннель (для тестирования webhook'ов), обновите переменную окружения:

```bash
# В .env файле или docker-compose.yml
VITE_API_URL=https://your-backend-tunnel-url.trycloudflare.com/api/v1
```

Или используйте proxy в `vite.config.ts` (уже настроен).

## 🛑 Остановка

### Остановить туннели:
```bash
./scripts/tunnel-stop.sh
```

Или вручную:
```bash
pkill cloudflared
```

### Остановить Docker:
```bash
docker-compose down
```

## ⚠️ Важные замечания

1. **URL меняется**: Каждый раз при перезапуске туннеля URL будет новый. Вам нужно обновить его в BotFather.

2. **Туннель работает только пока запущен**: Если вы закроете терминал с туннелем, URL перестанет работать.

3. **Для продакшена**: Используйте постоянный домен и настройте постоянный туннель через Cloudflare Zero Trust.

4. **CORS**: Backend уже настроен для работы с туннелями Cloudflare.

## 🐛 Решение проблем

### Туннель не запускается
```bash
# Проверьте, что cloudflared установлен
which cloudflared

# Проверьте, что порты свободны
lsof -i :5173
lsof -i :3001
```

### Docker не запускается
```bash
# Проверьте статус Docker
docker ps

# Если Docker не запущен, запустите Docker Desktop
```

### Frontend не подключается к Backend
- Убедитесь, что оба туннеля запущены
- Проверьте логи: `docker-compose logs backend`
- Проверьте, что proxy настроен в `vite.config.ts`

## 📚 Дополнительная информация

- [Cloudflare Tunnel документация](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Telegram Mini Apps документация](https://core.telegram.org/bots/webapps)






