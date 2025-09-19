# EonMentor AI – আর্থিক সাক্ষরতা ব্রাউজার এক্সটেনশন

> বাংলা ডিটেইলড ডকুমেন্টেশন – আপনার নির্বাচিত (highlight) করা ফিন্যান্স সম্পর্কিত টেক্সটকে সহজ ভাষায় ব্যাখ্যা, শব্দার্থ (glossary), সামারি, ও মাল্টি-প্রোভাইডার AI ফfallback সহ একটি Chrome MV3 এক্সটেনশন।

## ✨ কী করে এই এক্সটেনশন?
নির্বাচিত (highlight) করা যেকোনো ফিন্যান্স / ইকোনমিক্স টেক্সটকে:
- সহজ ভাষায় ব্যাখ্যা (Explain)
- গুরুত্বপূর্ণ টার্ম খুঁজে বের করে (Financial Terms Extraction)
- ছোট সামারি তৈরি করে (Extractive Summary)
- লোকাল / Chrome Built‑in AI / OpenAI / Claude / Gemini fallback চেইন ব্যবহার করে
- সংযোগ ব্যর্থ হলে লোকাল অ্যানালাইসিস fallback
- Persistent Port + sendMessage fallback দিয়ে নির্ভরযোগ্য Messaging

## 🏗 আর্কিটেকচার ও মডিউল
মোনো-রিপো কাঠামো:
```
packages/
  extension/      # Chrome MV3 (content script, service worker, popup, options)
  shared/         # Reusable logic (AI orchestration, glossary, summarizer, utils)
  backend/        # (Future) Optional API façade / proxy (placeholder)
```
মূল লেয়ারসমূহ:
- Content Script: Highlight শনাক্ত, বাটন UI, Tooltip রেন্ডার, Port + fallback messaging
- Service Worker: AI provider orchestration, টার্ম ডিটেকশন, সামারি, রেসপন্স শেপিং
- Shared: `ai-service.ts`, glossary JSON, summarizer utilities, rewrite/translate stubs
- Popup / Options: (বর্তমানে মিনিমাল) কনফিগ ও API কী সেটআপের জন্য

## 🔌 Messaging ডিজাইন
| Layer | Primary | Fallback | বৈশিষ্ট্য |
|-------|---------|----------|-----------|
| Content -> SW | Persistent `chrome.runtime.connect` Port | `chrome.runtime.sendMessage` | Correlation ID `_cid`, টাইমআউট সুরক্ষা |
| Retry Logic | Context invalidated হলে ১ম retry + ping | Local inline fallback | UX continuity |

## 🤖 AI Provider Fallback চেইন
Priority (availability অনুযায়ী):
1. Chrome Built‑in AI (যদি থাকে)
2. OpenAI (API Key সহ)
3. Claude (API Key সহ)
4. Gemini (API Key সহ)
5. Local Heuristic বিশ্লেষণ

লোকাল অ্যানালাইসিস কী করে:
- সাধারণ ফিন্যান্স কীওয়ার্ড শনাক্ত
- ক্যাটেগরি ভিত্তিক confidence স্কোর করে
- সহজ ব্যাখ্যা তৈরি করে

## 🧠 লোকাল সামারি (Extractive)
`service-worker.ts` ও `standalone-service-worker.ts` এ বিদ্যমান:
- টেক্সটকে বাক্যে ভাগ
- ফ্রিকোয়েন্সি + ফিন্যান্স টার্ম presence স্কোর
- উচ্চ স্কোরযুক্ত ২টি বাক্য নির্বাচন

## 📦 Installation / ডেভেলপমেন্ট
```bash
npm install
# Shared build (type declarations ইত্যাদি)
npm run build -w @eonmentor/shared
# Extension dev (Vite watch)
npm run dev:ext
```
Chrome এ লোড:
1. chrome://extensions
2. Developer Mode ON
3. Load unpacked > `packages/extension/dist`

Production build:
```bash
npm run build
```

## 🔑 API Key সেটআপ
Options / Settings Panel থেকে বা DevTools storage:
- `openai_api_key`
- `claude_api_key`
- `gemini_api_key`
- `enable_cloud_ai` (boolean)

Cloud নিষ্ক্রিয় (`enable_cloud_ai = false`) হলে সরাসরি লোকাল অ্যানালাইসিসে যায়।

## 🛡 রেজিলিয়েন্স বৈশিষ্ট্য
- Extension context invalidated → Ping + retry
- Port disconnect হলে exponential backoff reconnect
- In‑flight pending map reject + fallback path
- Local inline বিশ্লেষণ (content script) জরুরি fallback

## 🗂 গুরুত্বপূর্ণ ফাইল
| ফাইল | কাজ |
|------|-----|
| `packages/extension/src/content/content-script.ts` | Selection UI, Port Messaging, Tooltip রেন্ডার |
| `packages/extension/src/background/standalone-service-worker.ts` | ইনলাইন AI + বিশ্লেষণ (ডুপ্লিকেট লজিক) |
| `packages/extension/src/background/service-worker.ts` | Shared `ai-service` ব্যবহারকারী Worker |
| `packages/shared/src/ai-service.ts` | Provider fallback orchestration |
| `packages/shared/src/utils/summarizer.ts` | (ভবিষ্যৎ উন্নতি) Extractive summarizer পৃথক করা যাবে |
| `packages/shared/src/glossary/finance-terms.en.json` | বেসিক টার্ম ডেটা |

⚠ ডুপ্লিকেশন সতর্কতা: দুইটি Service Worker ভ্যারিয়েন্ট আছে। ভবিষ্যৎ রিফ্যাক্টর প্ল্যান – একটিতে কনসলিডেট + shared ডোমেইন ফাংশনে টার্ম/সামারি লজিক স্থানান্তর।

## 🚀 পরিকল্পিত রিফ্যাক্টর (Roadmap)
| ধাপ | লক্ষ্য |
|-----|------|
| 1 | আর্কিটেকচার গ্যাপ অ্যানালাইসিস সম্পন্ন |
| 2 | Consolidated Service Worker + MessagingClient abstraction |
| 3 | Shared summarizer + glossary enrichment (multi-language) |
| 4 | Popup UI উন্নয়ন: Provider status, ব্যাচ সামারি, rewrite tool |
| 5 | টেস্ট (unit: summarizer, glossary matcher, provider selector) |
| 6 | CI (lint + typecheck + build) GitHub Actions |
| 7 | i18n (বাংলা UI option) |

## 🧪 ভবিষ্যৎ টেস্ট আইডিয়া
- Provider priority selection (মক কী config)
- Local analysis edge cases (খালি টেক্সট, অনেক লম্বা টেক্সট)
- Messaging timeout scenario simulated
- Glossary term overlap / synonym resolution

## 🔍 সমস্যা / সীমাবদ্ধতা
- ডুপ্লিকেট term detection লজিক (দুই worker)
- Summarizer heuristic খুব সরল
- Error model string-based (একটি enum বা কাঠামো দরকার)
- Security: Remote API কলে rate limiting / batching নাই

## ♻ সম্ভাব্য উন্নয়ন
- Embeddings ভিত্তিক semantic ফিন্যান্স term ম্যাচিং
- Multi-sentence adaptive summary (length target অনুযায়ী)
- Provider latency metric সংগ্রহ করে dynamic reordering
- Caching layer (hash of text → explanation)
- Offline glossary enrichment (BN localization)

## 🏁 দ্রুত ব্যবহার (User Flow)
1. পেজে কিছু ফিন্যান্স টেক্সট সিলেক্ট করুন
2. ভাসমান “🧠 Explain” বাটন আসবে
3. ক্লিক → Tooltip এ ব্যাখ্যা, টার্ম, সামারি
4. ব্যর্থ হলে লোকাল fallback রিপোর্ট

## 🧾 লাইসেন্স
(আপনি যদি MIT চান, যোগ করুন) উদাহরণ:
```
MIT License
Copyright (c) 2025 GALIB-Dev
```

## 🙋 অবদান (Contributing)
Pull Request এর আগে:
- Lint pass (`eslint .`)
- Typecheck (`tsc -b`)
- Build green (`npm run build`)

## 🇧🇩 বাংলা নোট
এই ডকুমেন্ট ভবিষ্যতে বাংলা UI যোগ করার বেস রেফারেন্স হবে। Glossary কে বহুভাষিক করতে JSON কীগুলো রেখে আলাদা locale ফাইল যোগ করা যাবে।

---
আরও বিস্তারিত আর্কিটেকচার / কোড রিফ্যাক্টর প্ল্যান চাইলে বলুন – আমি পরের ধাপে "Architecture Gap Analysis" তৈরি করবো।
