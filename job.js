import puppeteer from "puppeteer";
import { initializeDatabase, getDatabase, closeDatabase } from "./db/database.js";
import { schema } from "./db/schema.js";
import { isNull, asc, eq } from "drizzle-orm";

const BATCH_SIZE = 10;

const VAT_REGEX = /(ΑΦΜ|VAT|Afm|Α\.Φ\.Μ[.:])[:\s]*([0-9]{9})/i;

async function getVatNumber(url) {
    const browser = await puppeteer.launch({
        headless: true,
        // comment this out if you run in an environment where Chrome sandbox works fine
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20_000,
        });
        const iframeElement = await page.waitForSelector("iframe", {timeout: 10_000});

        if (iframeElement) {
            const iframeFrame = await iframeElement.contentFrame();

            if (iframeFrame) {
                try {
                    await iframeFrame.waitForFunction(
                        () => {
                            const bodyText = document.body?.innerText || '';
                            return bodyText.length > 50 && !bodyText.includes('Loading...');
                        },
                        {timeout: 10_000}
                    );
                } catch (err) {
                    // Fallback: wait a bit longer
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                if (iframeFrame) {
                    const html = await iframeFrame.content();
                    const match = html.match(VAT_REGEX);
                    if (match && match[2]) {
                        return match[2];
                    }
                }
            }

            throw new Error("Could not find VAT/ΑΦΜ number on the page or in iframe");
        }
    } finally {
        await browser.close();
    }
}

(async () => {
    try {
        // Initialize database connection
        await initializeDatabase();
        const db = getDatabase();

        let offset = 0;
        let totalProcessed = 0;
        let batchNumber = 1;

        // Process receipts in batches
        while (true) {
            // Fetch a batch of receipts with null VAT, ordered by created_at
            const receiptsBatch = await db
                .select()
                .from(schema.receipts)
                .where(isNull(schema.receipts.vat))
                .orderBy(asc(schema.receipts.createdAt))
                .limit(BATCH_SIZE)
                .offset(offset);

            if (receiptsBatch.length === 0) {
                console.log(`No more receipts to process. Total processed: ${totalProcessed}`);
                break;
            }

            console.log(`\nProcessing batch ${batchNumber} (${receiptsBatch.length} receipts)...`);

            // Process each receipt in the batch
            for (const receipt of receiptsBatch) {
                try {
                    console.log(`Processing receipt ${receipt.id}...`);

                    // qrData should contain the invoice URL
                    const url = receipt.qrData;

                    if (!url || !url.startsWith('http')) {
                        console.log(`Skipping receipt ${receipt.id}: qrData is not a valid URL`);
                        continue;
                    }

                    // Extract VAT number from the invoice URL
                    const vat = await getVatNumber(url);

                    if (vat) {
                        // Update receipt with extracted VAT
                        await db
                            .update(schema.receipts)
                            .set({ vat: vat })
                            .where(eq(schema.receipts.id, receipt.id));

                        console.log(`✓ Updated receipt ${receipt.id} with VAT: ${vat}`);
                        totalProcessed++;
                    } else {
                        console.log(`✗ Could not extract VAT for receipt ${receipt.id}`);
                    }
                } catch (err) {
                    console.error(`Error processing receipt ${receipt.id}:`, err.message);
                    // Continue with next receipt
                }
            }

            // Move to next batch
            offset += BATCH_SIZE;
            batchNumber++;

            // If we got fewer than BATCH_SIZE, we've reached the end
            if (receiptsBatch.length < BATCH_SIZE) {
                break;
            }
        }

        console.log(`\nProcessing complete. Total receipts processed: ${totalProcessed}`);
        await closeDatabase();
    } catch (err) {
        console.error("Error:", err.message);
        await closeDatabase().catch(() => {});
        process.exit(1);
    }
})();
