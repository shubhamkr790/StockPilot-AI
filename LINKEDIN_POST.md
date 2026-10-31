Ramesh runs a kirana store with 300 products and one notebook.

His cooking oil runs out before he notices. His supplier bills pile up. His stock count is almost always wrong.

I had 4 hours to fix that at the MedaVida intern hackathon. Here's what I built: StockPilot AI.

📸 Snap a supplier bill. AI reads every line, matches it to your products, and waits for you to confirm before stock changes.

🗣️ Say "2 Parle-G, 1 oil, half kilo rice" and the bill fills itself.

📦 It tells you what to reorder and shows the maths: "Sells 6/day, 9 left, 4-day lead time → order 48."

The scariest moment came halfway through. I found that my first version decided who was logged in from a request header. Anyone could change one line and act as the shop owner. I rebuilt login with signed tokens, then wrote tests where one shop tries to open another shop's products by changing the ID in the URL. It gets "not found" every time.

Then Google retired the Gemini model I was using, mid-build. The app now falls back to another model on its own.

Demo video 👇
[paste video link]

Thank you MedaVida for a brilliant challenge.
@MedaVida @Christina Camacho @Mallikarjuna Mudiam @Mahesh Das

#Hackathon #BuildInPublic #AI #Inventory #MedaVida
