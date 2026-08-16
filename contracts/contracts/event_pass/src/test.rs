#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Events}, Address, Env};

#[test]
fn test_initialize_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EventPassContract);
    let client = EventPassContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let asset = Address::generate(&env); // Mock asset

    let event_name = String::from_str(&env, "HackTropica 2027");
    
    // Test initialization
    client.initialize(&admin, &event_name, &100u32, &0i128, &asset);
    
    // Test claim
    let ticket_id = client.claim_ticket(&user);
    assert_eq!(ticket_id, 1);
    
    let owner = client.get_owner(&ticket_id);
    assert_eq!(owner, user);
    
    let state = client.verify_ticket(&ticket_id);
    assert_eq!(state, TicketState::Valid);
    
    // Test use
    client.use_ticket(&admin, &ticket_id);
    let state_after = client.verify_ticket(&ticket_id);
    assert_eq!(state_after, TicketState::Used);
}
