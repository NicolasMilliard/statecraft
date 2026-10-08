import axios from 'axios';

export async function createOrder(input: { cartId: string }) {
  const response = await axios.post('/api/orders', input);
  return response.data;
}
