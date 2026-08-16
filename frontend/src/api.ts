const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface EventData {
    name: string;
    description?: string;
    max_tickets: number;
    price_stroops: number;
    admin_public_key: string;
}

export interface TicketData {
    id: number;
    event_id: number;
    owner_public_key: string;
    state: string;
}

export const api = {
    createEvent: async (data: EventData) => {
        const response = await fetch(`${BACKEND_URL}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create event on backend');
        return response.json();
    },
    
    getEvents: async () => {
        const response = await fetch(`${BACKEND_URL}/api/events`);
        if (!response.ok) throw new Error('Failed to fetch events');
        return response.json();
    },

    syncTicket: async (ticket_id: number, event_id: number, owner_public_key: string) => {
        const response = await fetch(`${BACKEND_URL}/api/tickets/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id, event_id, owner_public_key }),
        });
        if (!response.ok) throw new Error('Failed to sync ticket');
        return response.json();
    },

    useTicket: async (ticket_id: number, admin_public_key: string) => {
        const response = await fetch(`${BACKEND_URL}/api/tickets/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id, admin_public_key }),
        });
        if (!response.ok) throw new Error('Failed to mark ticket as used');
        return response.json();
    },
    
    verifyTicket: async (ticket_id: number) => {
        const response = await fetch(`${BACKEND_URL}/api/verify/${ticket_id}`);
        if (!response.ok) throw new Error('Ticket not found or invalid');
        return response.json();
    }
};
