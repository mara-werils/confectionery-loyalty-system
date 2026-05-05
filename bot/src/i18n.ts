export type Lang = 'ru' | 'kz' | 'en';

interface Messages {
  welcome: string;
  welcomeDescription: string;
  openMiniApp: string;
  balance: string;
  balanceInfo: string;
  balanceLifetime: string;
  balanceRedeemed: string;
  balanceError: string;
  balanceNotFound: string;
  rewards: string;
  rewardsTitle: string;
  rewardsEmpty: string;
  rewardsError: string;
  rewardPoints: string;
  rewardClaim: string;
  rewardClaimSuccess: string;
  rewardClaimError: string;
  rewardInsufficientPoints: string;
  referral: string;
  referralTitle: string;
  referralCode: string;
  referralShare: string;
  referralStats: string;
  referralCount: string;
  referralBonus: string;
  referralError: string;
  referralGenerating: string;
  help: string;
  helpTitle: string;
  helpCommands: string;
  errorGeneric: string;
  errorUnauthorized: string;
  notificationCashback: string;
  notificationCouponExpiry: string;
  notificationNewReward: string;
  langSwitched: string;
  chooseLanguage: string;
  availableLabel: string;
}

const messages: Record<Lang, Messages> = {
  ru: {
    welcome: 'Добро пожаловать в Sweet Loyalty! 🍰',
    welcomeDescription:
      'Я бот программы лояльности кондитерской. Здесь вы можете проверить баланс, получить награды и приглашать друзей.\n\nОткройте мини-приложение для полного доступа к системе лояльности.',
    openMiniApp: 'Открыть приложение',
    balance: 'Баланс',
    balanceInfo: 'Ваш баланс SWEET токенов:',
    balanceLifetime: 'Всего заработано',
    balanceRedeemed: 'Всего потрачено',
    balanceError: 'Не удалось получить баланс. Попробуйте позже.',
    balanceNotFound: 'Аккаунт не найден. Откройте мини-приложение для регистрации.',
    rewards: 'Награды',
    rewardsTitle: 'Доступные награды:',
    rewardsEmpty: 'Сейчас нет доступных наград.',
    rewardsError: 'Не удалось загрузить награды. Попробуйте позже.',
    rewardPoints: 'баллов',
    rewardClaim: 'Получить',
    rewardClaimSuccess: 'Награда успешно получена! Новый баланс: {balance} SWEET',
    rewardClaimError: 'Не удалось получить награду. Попробуйте позже.',
    rewardInsufficientPoints: 'Недостаточно баллов для получения этой награды.',
    referral: 'Реферальная программа',
    referralTitle: 'Ваша реферальная программа:',
    referralCode: 'Ваш реферальный код: <code>{code}</code>',
    referralShare: 'Поделитесь этим кодом с друзьями и получайте бонусы!',
    referralStats: 'Статистика рефералов',
    referralCount: 'Приглашено друзей: {count}',
    referralBonus: 'Заработано бонусов: {bonus} SWEET',
    referralError: 'Не удалось загрузить реферальные данные.',
    referralGenerating: 'Генерируем ваш реферальный код...',
    help: 'Помощь',
    helpTitle: 'Команды бота:',
    helpCommands:
      '/start — Начать работу с ботом\n/balance — Проверить баланс\n/rewards — Посмотреть доступные награды\n/referral — Реферальная программа\n/lang — Сменить язык\n/help — Показать справку',
    errorGeneric: 'Произошла ошибка. Попробуйте позже.',
    errorUnauthorized: 'Для использования этой команды необходимо зарегистрироваться в мини-приложении.',
    notificationCashback: 'Вы получили кэшбэк: +{amount} SWEET за покупку!',
    notificationCouponExpiry: 'Напоминание: ваш купон "{coupon}" истекает через {days} дн.',
    notificationNewReward: 'Новая награда доступна: {title} за {points} SWEET!',
    langSwitched: 'Язык изменен на русский.',
    chooseLanguage: 'Выберите язык / Тiлдi танданыз / Choose language:',
    availableLabel: 'В наличии',
  },
  kz: {
    welcome: 'Sweet Loyalty-ге қош келдіңіз! 🍰',
    welcomeDescription:
      'Мен кондитерлік адалдық бағдарламасының ботымын. Мұнда сіз балансты тексеріп, сыйлықтар алып, достарыңызды шақыра аласыз.\n\nТолық қол жеткізу үшін мини-қосымшаны ашыңыз.',
    openMiniApp: 'Қосымшаны ашу',
    balance: 'Баланс',
    balanceInfo: 'Сіздің SWEET токен балансыңыз:',
    balanceLifetime: 'Барлығы жиналған',
    balanceRedeemed: 'Барлығы жұмсалған',
    balanceError: 'Балансты алу мүмкін болмады. Кейінірек қайталаңыз.',
    balanceNotFound: 'Аккаунт табылмады. Тіркелу үшін мини-қосымшаны ашыңыз.',
    rewards: 'Сыйлықтар',
    rewardsTitle: 'Қолжетімді сыйлықтар:',
    rewardsEmpty: 'Қазір қолжетімді сыйлықтар жоқ.',
    rewardsError: 'Сыйлықтарды жүктеу мүмкін болмады. Кейінірек қайталаңыз.',
    rewardPoints: 'ұпай',
    rewardClaim: 'Алу',
    rewardClaimSuccess: 'Сыйлық сәтті алынды! Жаңа баланс: {balance} SWEET',
    rewardClaimError: 'Сыйлықты алу мүмкін болмады. Кейінірек қайталаңыз.',
    rewardInsufficientPoints: 'Бұл сыйлықты алу үшін ұпайлар жеткіліксіз.',
    referral: 'Реферал бағдарлама',
    referralTitle: 'Сіздің реферал бағдарламаңыз:',
    referralCode: 'Сіздің реферал кодыңыз: <code>{code}</code>',
    referralShare: 'Бұл кодпен достарыңызбен бөлісіңіз және бонустар алыңыз!',
    referralStats: 'Реферал статистикасы',
    referralCount: 'Шақырылған достар: {count}',
    referralBonus: 'Жиналған бонустар: {bonus} SWEET',
    referralError: 'Реферал деректерін жүктеу мүмкін болмады.',
    referralGenerating: 'Сіздің реферал кодыңыз жасалуда...',
    help: 'Көмек',
    helpTitle: 'Бот командалары:',
    helpCommands:
      '/start — Ботпен жұмысты бастау\n/balance — Балансты тексеру\n/rewards — Қолжетімді сыйлықтарды көру\n/referral — Реферал бағдарлама\n/lang — Тілді өзгерту\n/help — Анықтаманы көрсету',
    errorGeneric: 'Қате орын алды. Кейінірек қайталаңыз.',
    errorUnauthorized: 'Бұл команданы пайдалану үшін мини-қосымшада тіркелу қажет.',
    notificationCashback: 'Сіз кэшбэк алдыңыз: +{amount} SWEET сатып алу үшін!',
    notificationCouponExpiry: 'Еске салу: сіздің "{coupon}" купоныңыздың мерзімі {days} күнде аяқталады.',
    notificationNewReward: 'Жаңа сыйлық қолжетімді: {title} — {points} SWEET!',
    langSwitched: 'Тіл қазақшаға ауыстырылды.',
    chooseLanguage: 'Выберите язык / Тілді таңдаңыз / Choose language:',
    availableLabel: 'Қолжетімді',
  },
  en: {
    welcome: 'Welcome to Sweet Loyalty! 🍰',
    welcomeDescription:
      "I'm the confectionery loyalty program bot. Here you can check your balance, claim rewards, and invite friends.\n\nOpen the mini app for full access to the loyalty system.",
    openMiniApp: 'Open App',
    balance: 'Balance',
    balanceInfo: 'Your SWEET token balance:',
    balanceLifetime: 'Total earned',
    balanceRedeemed: 'Total spent',
    balanceError: 'Failed to fetch balance. Try again later.',
    balanceNotFound: 'Account not found. Open the mini app to register.',
    rewards: 'Rewards',
    rewardsTitle: 'Available rewards:',
    rewardsEmpty: 'No rewards available at the moment.',
    rewardsError: 'Failed to load rewards. Try again later.',
    rewardPoints: 'points',
    rewardClaim: 'Claim',
    rewardClaimSuccess: 'Reward claimed successfully! New balance: {balance} SWEET',
    rewardClaimError: 'Failed to claim reward. Try again later.',
    rewardInsufficientPoints: 'Insufficient points to claim this reward.',
    referral: 'Referral Program',
    referralTitle: 'Your referral program:',
    referralCode: 'Your referral code: <code>{code}</code>',
    referralShare: 'Share this code with friends and earn bonuses!',
    referralStats: 'Referral statistics',
    referralCount: 'Friends invited: {count}',
    referralBonus: 'Bonuses earned: {bonus} SWEET',
    referralError: 'Failed to load referral data.',
    referralGenerating: 'Generating your referral code...',
    help: 'Help',
    helpTitle: 'Bot commands:',
    helpCommands:
      '/start — Start using the bot\n/balance — Check your balance\n/rewards — View available rewards\n/referral — Referral program\n/lang — Change language\n/help — Show help',
    errorGeneric: 'An error occurred. Please try again later.',
    errorUnauthorized: 'You need to register in the mini app to use this command.',
    notificationCashback: 'You received cashback: +{amount} SWEET for your purchase!',
    notificationCouponExpiry: 'Reminder: your coupon "{coupon}" expires in {days} days.',
    notificationNewReward: 'New reward available: {title} for {points} SWEET!',
    langSwitched: 'Language switched to English.',
    chooseLanguage: 'Выберите язык / Тілді таңдаңыз / Choose language:',
    availableLabel: 'Available',
  },
};

// Simple in-memory user language preferences
const userLanguages = new Map<number, Lang>();

export function setUserLang(userId: number, lang: Lang): void {
  userLanguages.set(userId, lang);
}

export function getUserLang(userId: number): Lang {
  return userLanguages.get(userId) || 'ru';
}

export function t(userId: number, key: keyof Messages): string {
  const lang = getUserLang(userId);
  return messages[lang][key] || messages['ru'][key] || key;
}

export function tReplace(userId: number, key: keyof Messages, replacements: Record<string, string>): string {
  let message = t(userId, key);
  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replace(`{${placeholder}}`, value);
  }
  return message;
}
