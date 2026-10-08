import { createFileRoute } from '@tanstack/react-router';
import { CheckoutPage as Page } from '../pages/CheckoutPage';

export const Route = createFileRoute('/checkout')({ component: Page });
