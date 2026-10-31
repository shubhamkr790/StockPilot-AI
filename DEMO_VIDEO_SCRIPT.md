# StockPilot AI demo script (about 2 min 45 s)

Record on a laptop in a browser window at least 1280 px wide. Before you start, open the live link once so the server is awake, and keep `samples/invoice-2-fmcg.png` ready on your desktop.

What you say is in quotes. What you do is in brackets.

---

## 0:00 Landing page (15 s)

[Open the live link. The landing page is on screen.]

"Hi, I'm [your name]. This is StockPilot AI, which I built for the MedaVida hackathon. It's for small shops like Ramesh's, where stock lives in a notebook and fast sellers run out without anyone noticing."

[Click "Try the demo".]

## 0:15 Sign in as the owner (15 s)

[Tap Ramesh on the sign-in page.]

"There are three demo accounts: Ramesh the owner, Priya who works at his counter, and Anita, who runs a separate pharmacy. I'll start as Ramesh."

[Dashboard loads.]

"The first thing Ramesh sees is what to reorder. Sunflower oil sells 6 a day, he has 9 left, and his supplier takes 4 days. So it says order 48, two packs of 24, and it runs out tomorrow. The AI brief at the top says the same thing in plain words."

## 0:30 Add a product (20 s)

[Products → Add product. Type: name "Haldiram Bhujia 200g", SKU "SNK-BHU-200", category "Snacks", cost 45, price 55, opening stock 10. Save.]

"Adding a product takes a few seconds. Prices are stored in paise, as whole numbers, so the money never picks up rounding errors."

[Click History on the new product.]

"Every change to stock is a recorded movement with who did it, when and why. Here's the opening stock entry."

## 0:50 Scan a supplier invoice (40 s)

[Invoices → Choose file → pick invoice-2-fmcg.png. Wait for it to read.]

"Now a supplier bill. I upload a photo and Gemini reads it: supplier, invoice number, date, and every line."

[Scroll through the review screen.]

"Nothing has changed stock yet. Each line is matched to a product, and I can change the match. Haldiram is now in my catalogue, so I'll point it there. And look at the bottom: the lines add up to ₹60 less than the printed total, so it warns me."

[Fix the total to match the lines. Click Confirm.]

"I confirm, and all lines are added to stock together, or none are."

[Upload the same file again.]

"If I upload the same invoice twice, it warns me straight away, and confirming it again is refused. So stock can never be added twice."

## 1:30 Make a sale as staff (25 s)

[Sign out. Tap Priya.]

"Now I'm Priya at the counter. She can sell and check stock, but she can't change prices or approve invoices."

[On Sell, type in the AI box: "2 parle g, 1 sunflower oil, half kg rice". Press Add. Or click the mic and say it.]

"She just types or says the order, and the bill fills itself. She checks it and taps Complete sale. That took about ten seconds."

[Tap Complete sale.]

## 1:55 A failure case (20 s)

[Search sunflower oil, set quantity to 50, try to complete.]

"If she tries to sell more than we have, it's blocked and tells her how many are left."

[Sign out. Tap Ramesh. Open Test lab. Click Run all.]

"The owner's Test lab runs the hard cases against the live server. Two staff selling the last units at the same moment: only one wins. Anita changing the URL to open Ramesh's product: not found. Staff changing a price: refused."

## 2:15 Restock and export (20 s)

[Open Restock.]

"Restock shows every suggestion with its reason and the actual calculation. 6 times 4 plus 4 days, minus the 9 in stock, is 39, rounded up to packs of 24 gives 48. If a product has less than a week of sales, it says not enough history instead of guessing."

[Click Export CSV, then Print.]

"Ramesh can export the list or print it for his supplier."

## 2:35 Close (10 s)

"That's StockPilot AI. The code, the README and the sample invoices are in the submission. Thanks for watching."

---

## If something goes wrong while recording

- The invoice takes more than 20 seconds: Gemini is busy. Wait, or click "Enter manually" and say "OCR is busy, so I'll show the manual path that goes through the same review."
- The live site is slow on first load: the free server was asleep. Refresh once.
- The data looks messy after practice runs: redeploy on Render, or locally delete `data/state.json` and restart. Both reset to the demo seed.
