import type { User } from '../types/api';

/**
 * GM Sales and Admin Sales are console roles: they monitor the team from the
 * web console and do not canvass. Only field roles (Account Manager, Sales
 * Manager) get canvassing in the app.
 */
export function canCanvass(user: User | null | undefined): boolean {
    return user?.role === 'account_manager' || user?.role === 'sales_manager';
}
