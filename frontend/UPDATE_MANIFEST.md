# Как обновить TonConnect манифест при изменении URL

Когда вы перезапускаете cloudflared и получаете новый URL, нужно обновить манифест:

## Шаги:

1. **Получите новый Cloudflare URL** (из вывода cloudflared):
   ```
   https://новый-домен-12345.trycloudflare.com
   ```

2. **Обновите файл `public/tonconnect-manifest.json`**:
   Замените все вхождения старого URL на новый в полях:
   - `url`
   - `iconUrl`
   - `termsOfUseUrl`
   - `privacyPolicyUrl`

3. **Перезапустите frontend**:
   ```bash
   docker-compose restart frontend
   ```

4. **Проверьте доступность манифеста**:
   Откройте в браузере: `https://ваш-новый-url.trycloudflare.com/tonconnect-manifest.json`
   Должен открыться JSON файл.

## Автоматическое обновление (альтернатива):

Используйте переменную окружения `VITE_TONCONNECT_MANIFEST_URL` в `.env`:
```
VITE_TONCONNECT_MANIFEST_URL=https://ваш-постоянный-url.com/tonconnect-manifest.json
```

## Для продакшена:

Рекомендуется задеплоить frontend на Vercel/Netlify для получения постоянного URL.









