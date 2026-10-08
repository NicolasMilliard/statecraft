import { useCheckout as useCheckoutFlow } from '../hooks/useCheckout';

export function CheckoutForm() {
  const { cart, createOrder } = useCheckoutFlow();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        createOrder.mutate({ cartId: cart.data?.id ?? '' });
      }}
    >
      <button type="submit">Place order</button>
    </form>
  );
}
