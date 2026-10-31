# Kana Flick Trainer

PWA for practising your phone's **real** Japanese 12-key flick keyboard (Gboard "日本語 12キー", iOS "かな").
Input is checked live while the IME is still composing, so you never need to press 確定.

## Run on your phone (same Wi-Fi)
```sh
npm install
npm run dev        # or: npm run build && npm run preview
```
Open the printed `Network: https://<pc-ip>:5173` URL on the phone, accept the self-signed certificate,
then use "Add to Home screen" / "Install app".

If nothing loads, open the port on Fedora's firewall:
`sudo firewall-cmd --add-port=5173/tcp --add-port=4173/tcp` (add `--permanent` to keep it).

Live at **https://kana.raumi.dev**: every push to `main` is tested, built and deployed by `.github/workflows/pages.yml`.

## Modes
Kana drill (selectable rows, adaptive) · Words · Phrases · 60 s speed run · Weak spots · Stats with a mastery heat-map.

## Dev
- `npm test`: matcher unit tests (`src/input/match.test.ts`)
- Turn on "IME debug log" in settings to see raw composition/input events from your keyboard.
