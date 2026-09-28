/* global document, navigator, setTimeout */
const assert = require('node:assert/strict');

module.exports = async function auditLive(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/css/pages/install.css`);
  const result = await page.evaluate(async () => {
    document.body.innerHTML = '<div id="test-view"><div class="courier-page"></div></div>';
    const view = document.querySelector('#test-view');
    const { api } = await import('/js/core/api.js');
    const { mountLocation } = await import('/js/core/courier-location.js');
    const calls = [];
    api.courierLocation = async body => { calls.push(body); return {}; };
    let success, denied, clears = 0;
    Object.defineProperty(navigator, 'geolocation', { configurable:true, value: {
      watchPosition(ok, error) { success = ok; denied = error; return 1; },
      clearWatch() { clears++; },
    } });
    const delivery = { id:'test-delivery', status:'out_for_delivery' };
    let cleanup = mountLocation(view, delivery);
    cleanup();
    const passiveCleanupSendsNothing = calls.length === 0;
    view.innerHTML = '<div class="courier-page"></div>';
    cleanup = mountLocation(view, delivery);
    let toggle = view.querySelector('button');
    toggle.click();
    success({ coords:{ latitude:-23.5, longitude:-46.6, accuracy:8 }, timestamp:Date.now() });
    await Promise.resolve();
    const sendsGPS = calls.some(call => call.latitude === -23.5);
    toggle.click();
    const stopped = calls.at(-1).stop === true && clears > 0;
    const beforeStale = calls.length;
    success({ coords:{ latitude:1, longitude:1, accuracy:1 }, timestamp:Date.now() });
    const ignoresStaleCallback = calls.length === beforeStale;
    toggle.click();
    denied({ code:1 });
    const permissionMessage = view.querySelector('[role=status]').textContent.includes('permissão');
    cleanup();

    const courier = await import('/js/pages/courier.js');
    let deliveryStatus = 'picked_up';
    success = null;
    api.courierDashboard = async () => ({
      profile:{ name:'Teste', rating:5, available:true, vehicle:'Bicicleta' },
      current:{ id:'permission-test', orderId:'test-order', status:deliveryStatus },
      withdrawals:[], available:[], history:[], earnings:0, availableBalance:0,
    });
    api.updateCourierDelivery = async () => { deliveryStatus = 'out_for_delivery'; };
    await courier.render(view);
    const noPromptBeforeStart = success === null;
    view.querySelector('[data-delivery-action="start"]').click();
    await new Promise(resolve => setTimeout(resolve, 30));
    await courier.render(view);
    const promptsAfterStart = typeof success === 'function' && view.querySelector('[data-location-toggle]').textContent.includes('Parar');
    denied({ code:1 });
    const deliveryContinuesAfterDenial = view.querySelector('[data-delivery-action="deliver"]') !== null;
    courier.cleanup();

    const tracking = await import('/js/pages/tracking.js');
    let status = 'out_for_delivery';
    api.order = async () => ({ order:{ id:'test-order', status, createdAt:Date.now(), updatedAt:Date.now(), restaurantName:'Teste', total:12, items:[] } });
    api.orderChat = async () => ({ messages:[] });
    api.customerReviews = async () => ({ reviews:[] });
    api.orderLocation = async () => ({ position:null, routeEnabled:false });
    view.innerHTML = '';
    await tracking.render(view, {}, { id:'test-order' });
    const input = view.querySelector('[data-order-chat] input');
    input.value = 'Estou na portaria';
    input.focus();
    input.setSelectionRange(4, 4);
    await tracking.refreshRealtime();
    const updated = view.querySelector('[data-order-chat] input');
    const draftPreserved = updated.value === 'Estou na portaria' && document.activeElement === updated && updated.selectionStart === 4;
    status = 'delivered';
    await tracking.refreshRealtime();
    const finished = !view.querySelector('[data-order-chat]') && !view.querySelector('[data-delivery-map]');
    tracking.cleanup();
    return { passiveCleanupSendsNothing, sendsGPS, stopped, ignoresStaleCallback, permissionMessage, noPromptBeforeStart, promptsAfterStart, deliveryContinuesAfterDenial, draftPreserved, finished };
  });
  await context.close();
  for (const [name, passed] of Object.entries(result)) assert.equal(passed, true, name);
  return result;
};
