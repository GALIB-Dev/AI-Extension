# My AWESOME AI Extension!

## Hey there! Welcome to my super cool project!

So basically, I made this AMAZING browser extension that's like having a really smart friend who knows everything about money stuff!

### What does this thing do?

Okay, imagine you're reading something online and there's all this confusing money talk that makes your brain hurt. Well, my extension is like a magic translator! 

Here's what happens:
1. You highlight (select) any text about money, stocks, banking, whatever
2. A cute little button appears that says "Explain"
3. Click it and BOOM! It explains everything in simple words that actually make sense!
4. Plus it finds the important money words and gives you a short summary too!

It's like having ChatGPT, Claude, and other AI friends all working together to help you understand grown-up money talk!

## How I built this monster

I organized everything super neatly (my mom would be proud!):

```
packages/
  extension/     <- The actual browser extension (the cool stuff!)
  shared/        <- Code that everyone shares (like toys in kindergarten)
  backend/       <- Future server stuff (maybe someday...)
```

### The main parts:
- **Content Script**: This watches what you select and shows the magic button
- **Service Worker**: The brain that talks to all the AI services
- **Shared Code**: All the helper functions that do the heavy lifting
- **Popup & Options**: Where you can change settings (boring but necessary)

## My AI Squad

I made it work with LOTS of different AI services because I'm smart like that:

1. **Chrome's Built-in AI** (if your browser has it - so cool!)
2. **OpenAI** (the ChatGPT people)
3. **Claude** (another smart AI)
4. **Gemini** (Google's AI)
5. **My own local analyzer** (in case everything else fails - I got backup plans!)

If one doesn't work, it automatically tries the next one. It's like having multiple friends to ask for homework help!

## What makes it special?

- It explains money stuff in words that don't make your head explode
- Finds all the important finance words and explains them too
- Makes short summaries so you don't have to read EVERYTHING
- Works even when the internet is being weird
- I made sure it doesn't crash when things go wrong (learned that the hard way!)

## How to get it running

**Super easy setup** (I promise it's not scary!):

1. First, download all the stuff my code needs:
   ```
   npm install
   ```
   (This is like downloading all the LEGO pieces before building something cool)

2. Build the shared code first (trust me on this):
   ```
   npm run build -w @eonmentor/shared
   ```

3. Start the development mode (this is where the magic happens):
   ```
   npm run dev:ext
   ```

4. Now add it to Chrome:
   - Open Chrome and type `chrome://extensions` in the address bar
   - Turn ON "Developer mode" (there's a toggle in the top right)
   - Click "Load unpacked" and choose the `packages/extension/dist` folder
   - BAM! Your extension is now installed!

**To make the final version:**
```
npm run build
```

## Setting up your AI friends

You need API keys to talk to the smart AIs. It's like having passwords to join their exclusive club:

Go to the extension's options page and add:
- `openai_api_key` - for ChatGPT 
- `claude_api_key` - for Claude
- `gemini_api_key` - for Google's AI
- Set `enable_cloud_ai` to `true` if you want to use them

Don't have API keys? No worries! It'll still work with my backup local analyzer (I'm always prepared!)

## Cool features that make me proud

- **Never gives up**: If one AI is having a bad day, it tries another one
- **Works offline**: My local analyzer works even without internet
- **Super reliable**: I added lots of error handling so it doesn't break
- **Smart messaging**: Uses fancy communication tricks between different parts
- **Safe**: Doesn't crash your browser (learned from experience)

## The important files (for curious people)

| File | What it does |
|------|-------------|
| `content-script.ts` | Watches what you select and shows the button |
| `service-worker.ts` | The main brain that coordinates everything |
| `ai-service.ts` | Talks to all the different AIs |
| `summarizer.ts` | Makes short summaries of long text |
| `finance-terms.en.json` | Database of money words and what they mean |

## My future plans (so exciting!)

Here's what I want to add next:
- [ ] Make it work in more languages (maybe Spanish?)
- [ ] Better UI that looks super professional 
- [ ] More AI services (there are SO many!)
- [ ] Save your favorite explanations 
- [ ] Make it work on more websites
- [ ] Add tests (boring but important)
- [ ] Make it faster and smarter
- [ ] Add a cool dark mode theme

## Things I'm still fixing

- Some code is repeated in two places (I know, I know... I'll fix it!)
- The text summary could be smarter
- Need better error messages
- Should add some rate limiting so I don't spam the AI services
- The local analyzer is pretty basic (but it works!)

## How to use it (the fun part!)

1. Go to any website with money talk (news, articles, whatever)
2. Highlight any text that confuses you
3. Look for the floating "Explain" button
4. Click it and watch the magic happen!
5. Read the simple explanation in the tooltip
6. Feel smarter!

## Want to help make it better?

If you want to contribute (that'd be awesome!):
- Make sure your code doesn't have errors: `eslint .`
- Make sure your code doesn't have errors: `eslint .`
- Check types: `tsc -b`  
- Make sure it builds: `npm run build`
- Then send me a pull request!

I love getting help from other coders - it makes the project so much better! 

## License stuff (the boring legal part)

```
MIT License
Copyright (c) 2025 GALIB-Dev
```

Basically, you can use my code however you want, just give me credit!

## A note about languages

Right now it's mostly in English, but I designed it so adding other languages will be super easy. The money terms database can totally be translated! Maybe I'll add Bengali next since I speak it too!

## Thanks for checking out my project!

I worked really hard on this and I'm super proud of it. If you use it and it helps you understand money stuff better, that makes me SO happy!

This was my first big coding project and I learned SO much making it. Like, seriously, I probably googled "how to make browser extension" like a million times!

Hit me up if you have questions or ideas - I love talking about code and I'm always looking to learn new stuff!

---

*P.S. - Yes, I know some parts of the code could be cleaner. I'm still learning and improving! That's what makes coding fun - there's always something new to figure out!*

*P.P.S. - My parents think I'm some kind of genius now that I made this. They don't really understand what it does, but they're proud anyway!*