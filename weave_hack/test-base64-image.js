// Test script to verify base64 image encoding/decoding

// Sample data URL from Chrome screenshot
const sampleDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Test the regex
const regex = /^data:image\/[a-z]+;base64,/i;
const base64Only = sampleDataUrl.replace(regex, '');

console.log("Original data URL:", sampleDataUrl);
console.log("Base64 only:", base64Only);
console.log("Regex matched:", regex.test(sampleDataUrl));

// Test with different formats
const testFormats = [
    "data:image/png;base64,ABC123...",
    "data:image/jpeg;base64,XYZ789...",
    "data:image/PNG;base64,DEF456...",  // uppercase
    "data:image/webp;base64,GHI012..."
];

console.log("\nTesting different formats:");
testFormats.forEach(format => {
    const result = format.replace(regex, '');
    console.log(`${format} → ${result}`);
});

// Function to validate base64
function isValidBase64(str) {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
}

console.log("\nIs valid base64:", isValidBase64(base64Only));

// Test decoding
try {
    const decoded = atob(base64Only);
    console.log("Decoded length:", decoded.length, "bytes");
    console.log("Successfully decoded!");
} catch (e) {
    console.error("Failed to decode:", e.message);
} 