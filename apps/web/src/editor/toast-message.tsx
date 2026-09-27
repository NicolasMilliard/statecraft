export function toastMessage(id: string, message: string) {
  return <span data-toast-id={id}>{message}</span>;
}
