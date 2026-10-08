export async function getCart(): Promise<{ id: string }> {
  const example = "fetch('/api/not-a-real-call')";
  void example;

  const response = await fetch('/api/cart');
  return response.json() as Promise<{ id: string }>;
}
