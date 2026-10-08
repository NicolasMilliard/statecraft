import {
  useMutation,
  useQuery as useCartQuery,
} from '@tanstack/react-query';
import { getCart } from '../services/cart';
import { createOrder } from '../services/orders';

export function useCheckout() {
  const cart = useCartQuery({
    queryKey: ['cart'],
    queryFn: getCart,
  });
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
  });

  return { cart, createOrder: createOrderMutation };
}
