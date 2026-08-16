#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};
use soroban_sdk::token;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    EventName,
    MaxTickets,
    Price,
    Asset,
    CurrentTicketId,
    TicketOwner(u32),
    TicketState(u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TicketState {
    Valid,
    Used,
}

#[contract]
pub struct EventPassContract;

#[contractimpl]
impl EventPassContract {
    /// Initialize the event. Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        event_name: String,
        max_tickets: u32,
        price: i128,
        asset: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EventName, &event_name);
        env.storage().instance().set(&DataKey::MaxTickets, &max_tickets);
        env.storage().instance().set(&DataKey::Price, &price);
        env.storage().instance().set(&DataKey::Asset, &asset);
        env.storage().instance().set(&DataKey::CurrentTicketId, &0u32);
    }

    /// Check if the event is initialized.
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Admin)
    }

    /// Claim a ticket by paying the price in the specified asset.
    pub fn claim_ticket(env: Env, user: Address) -> u32 {
        user.require_auth();

        let max_tickets: u32 = env.storage().instance().get(&DataKey::MaxTickets).unwrap();
        let mut current_id: u32 = env.storage().instance().get(&DataKey::CurrentTicketId).unwrap();

        if current_id >= max_tickets {
            panic!("sold out");
        }

        let price: i128 = env.storage().instance().get(&DataKey::Price).unwrap();
        if price > 0 {
            let asset: Address = env.storage().instance().get(&DataKey::Asset).unwrap();
            let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
            let client = token::Client::new(&env, &asset);
            client.transfer(&user, &admin, &price);
        }

        current_id += 1;
        env.storage().instance().set(&DataKey::CurrentTicketId, &current_id);
        
        env.storage().persistent().set(&DataKey::TicketOwner(current_id), &user);
        env.storage().persistent().set(&DataKey::TicketState(current_id), &TicketState::Valid);

        // Emit an event
        env.events().publish((symbol_short!("claim"), current_id), user);

        current_id
    }

    /// Mark a ticket as used. Only the admin can do this (e.g. scanning at the door).
    pub fn use_ticket(env: Env, admin: Address, ticket_id: u32) {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized");
        }

        let state_key = DataKey::TicketState(ticket_id);
        if let Some(state) = env.storage().persistent().get::<_, TicketState>(&state_key) {
            if state != TicketState::Valid {
                panic!("ticket not valid");
            }
            env.storage().persistent().set(&state_key, &TicketState::Used);
            env.events().publish((symbol_short!("used"), ticket_id), admin);
        } else {
            panic!("ticket not found");
        }
    }

    /// Verify a ticket's state.
    pub fn verify_ticket(env: Env, ticket_id: u32) -> TicketState {
        let state_key = DataKey::TicketState(ticket_id);
        if let Some(state) = env.storage().persistent().get::<_, TicketState>(&state_key) {
            state
        } else {
            panic!("ticket not found");
        }
    }

    /// Get the owner of a ticket.
    pub fn get_owner(env: Env, ticket_id: u32) -> Address {
        let owner_key = DataKey::TicketOwner(ticket_id);
        if let Some(owner) = env.storage().persistent().get::<_, Address>(&owner_key) {
            owner
        } else {
            panic!("ticket not found");
        }
    }
}
