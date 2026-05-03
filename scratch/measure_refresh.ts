import { getDigest } from "../src/lib/digest";

async function measure() {
    console.log("Starting fresh digest build...");
    const start = Date.now();
    try {
        await getDigest();
        const end = Date.now();
        console.log(`Finished in ${(end - start) / 1000} seconds.`);
    } catch (e) {
        console.error("Error during build:", e);
    }
}

measure();
