export const SCORING_PROMPT = `ANALYZE Reddit post for buying intent (0-100 score).

Buying signals (HIGH score):
- "recommend me", "looking for", "best tool for", "what do you use"
- "need help with", "struggling with", "any suggestions", "alternatives to"
- Budget mentions: "$500 budget", "pay $X", "worth it?"

Low intent (LOW score):
- General discussion, memes, news, rants without product inquiry

POST: {{post}}

Respond ONLY with valid JSON, no markdown:
{"score": 85, "reason": "mentions budget + seeking recommendations"}`;

export const REPLY_PROMPT = `Ты опытный Reddit user. Напиши NATURAL комментарий для поста.

ПРАВИЛА (ОБЯЗАТЕЛЬНО):
1. НЕ спамь названием продукта
2. Сначала помоги/посоветуй БЕЗ продажи
3. Упомяни продукт естественно в конце
4. 2-4 предложения max
5. Как будто пишешь другу

Post: {{post}}
Product: {{product}}

Пример good reply:
"Я тоже этим мучился! Попробуй [tool] - помогло мне сильно упростить workflow. UI интуитивный и setup за 5 минут."

Generate reply (plain text only, no quotes):`;
