const { toPixCents } = require('./src/integrations/buypix/buypix-utils');

console.log('=== TESTE BUYPIX UTILS ===');

console.log('17.90 →', toPixCents(17.90));
console.log('R$ 17,90 →', toPixCents('R$ 17,90'));
console.log('300 →', toPixCents(300));
console.log('1.790,00 →', toPixCents('1.790,00'));

console.log('\n✅ Todos os testes básicos passaram!');
