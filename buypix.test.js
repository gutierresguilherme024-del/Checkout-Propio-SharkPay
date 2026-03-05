
// buypix.test.js
// Rode com: node buypix.test.js

const { toPixCents } = require("./buypix-utils");

// Mini framework de teste
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(` ✅ ${description}`);
    passed++;
  } catch (err) {
    console.log(` ❌ ${description}`);
    console.log(` → ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || "Assertion falhou"}\n Esperado: ${expected}\n Recebido: ${actual}`);
  }
}

function assertThrows(fn, msgContains) {
  try {
    fn();
    throw new Error("Esperava uma exceção, mas nenhuma foi lançada");
  } catch (err) {
    if (msgContains && !err.message.toLowerCase().includes(msgContains.toLowerCase())) {
      throw new Error(`Exceção lançada mas mensagem não contém "${msgContains}"\n Recebido: "${err.message}"`);
    }
  }
}

// Testes toPixCents()
console.log("\n📦 toPixCents — Conversão de Valor\n");

test("Converte float 17.90 → 1790", () => {
  assertEqual(toPixCents(17.90), 1790);
});

test("Converte string '17.90' → 1790", () => {
  assertEqual(toPixCents("17.90"), 1790);
});

test("Converte string 'R$ 17,90' → 1790", () => {
  assertEqual(toPixCents("R$ 17,90"), 1790);
});

test("Converte 300 → 30000", () => {
  assertEqual(toPixCents(300), 30000);
});

test("Lança erro para valor nulo", () => {
  assertThrows(() => toPixCents(null), "ausente");
});

test("Lança erro para string inválida", () => {
  assertThrows(() => toPixCents("abc"), "inválido");
});

test("Lança erro para valor zero", () => {
  assertThrows(() => toPixCents(0), "maior que zero");
});

// Resultado final
console.log(`\n${"─".repeat(40)}`);
console.log(`Resultado: ${passed} passou | ${failed} falhou`);
if (failed > 0) {
  console.log("⚠️ Corrija os erros acima");
  process.exit(1);
} else {
  console.log("🎉 Todos os testes passaram!");
  process.exit(0);
}