const keys = Object.keys(process.env).filter(k => k.startsWith('GEMINI_API_KEY'));
console.log(keys);
