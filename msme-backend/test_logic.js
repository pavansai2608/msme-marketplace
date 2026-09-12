const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

console.log('Now:', now);
console.log('Start:', startOfMonth);
console.log('End:', endOfMonth);

const orders = [
    { createdAt: new Date(), products: [{ price: 100, quantity: 1, seller: '123' }] },
    { createdAt: new Date('2026-04-16T10:00:00Z'), products: [{ price: 50, quantity: 2, seller: '123' }] }
];

const currentMonthOrders = orders.filter(o => o.createdAt >= startOfMonth && o.createdAt <= endOfMonth);
console.log('Current Month Orders:', currentMonthOrders.length);

const dailyData = {};
for (let d = 1; d <= endOfMonth.getDate(); d++) {
  dailyData[d] = 0;
}

currentMonthOrders.forEach(order => {
  const day = new Date(order.createdAt).getDate();
  dailyData[day] += 100; // dummy
});

console.log('Daily Data:', dailyData);
console.log('Month:', now.toLocaleString('default', { month: 'long' }));
console.log('Year:', now.getFullYear());
