// Sample file with intentional security issues for scanner testing

// ❌ Hardcoded API key
const API_KEY = 'AIzaSyAbCdEfGhIjKlMnOpQrStUv1234567890';

// ❌ Hardcoded JWT secret
const JWT_SECRET = 'my-super-secret-jwt-key-do-not-share';

// ❌ Hardcoded DB password
const DB_PASSWORD = 'admin123';

// ❌ Database connection string with credentials
const DB_URL = 'mongodb://admin:password123@localhost:27017/myapp';

// ❌ Unsafe eval
function runCode(userInput: string) {
  return eval(userInput);
}

// ❌ SQL Injection
async function getUserById(db: { query: (q: string) => Promise<unknown> }, userId: string) {
  return db.query(`SELECT * FROM users WHERE id = ${userId}`);
}

// ❌ XSS via innerHTML
function renderUserContent(content: string) {
  document.getElementById('output')!.innerHTML = content;
}

// ✅ Safe version (for comparison)
function renderUserContentSafe(content: string) {
  document.getElementById('output')!.textContent = content;
}

export { API_KEY, JWT_SECRET, DB_PASSWORD, DB_URL, runCode, getUserById, renderUserContent, renderUserContentSafe };
