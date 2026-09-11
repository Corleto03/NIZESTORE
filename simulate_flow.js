const uuid = require('crypto').randomUUID();
const deviceId = 'sim-device-' + uuid;
const cookie = 'nizestore_device_id=' + deviceId;

async function run() {
  console.log('--- Iniciando simulacion ---');
  
  // 1. Visit /api/cart to initialize session and cart
  console.log('1. Iniciando carrito...');
  let res = await fetch('http://localhost:3000/api/cart', { headers: { Cookie: cookie } });
  let cart = await res.json();
  console.log('Carrito ID:', cart.id_carrito);

  // 2. Add product variant 1 to cart
  console.log('2. Agregando Producto Variante 1...');
  res = await fetch('http://localhost:3000/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id_variante: 1, cantidad: 2 })
  });
  console.log('POST status:', res.status, await res.text());

  // Add product variant 2 to cart
  console.log('2.5 Agregando Producto Variante 2...');
  res = await fetch('http://localhost:3000/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id_variante: 2, cantidad: 1 })
  });
  console.log('POST status:', res.status, await res.text());

  // 3. Mark stage: direccion
  console.log('3. Guardando etapa: direccion...');
  res = await fetch('http://localhost:3000/api/checkout/stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ etapa: 'direccion_envio', completada: true })
  });
  console.log('Stage status:', res.status, await res.text());

  // 4. Checkout Process
  console.log('4. Procesando pago...');
  res = await fetch('http://localhost:3000/api/checkout/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      clienteData: { correo: 'simulated@nizestore.com', nombre: 'Simulated Bot', direccion: 'San Salvador, SV' },
      id_metodo_envio: 1,
      id_sucursal_retiro: null,
      id_metodo_pago: 1, // Tarjeta
      paymentDetails: { numero_tarjeta: '4242424242424242' } // Termina en par = aprobado
    })
  });
  console.log('Checkout status:', res.status, await res.text());
  
  console.log('--- Simulacion completada ---');
}
run().catch(console.error);
