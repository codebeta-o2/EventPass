from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import datetime

import models
import schemas
from database import engine, get_db

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Event Pass Backend")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/events", response_model=schemas.EventOut)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    db_event = models.Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@app.get("/api/events", response_model=list[schemas.EventOut])
def get_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(models.Event).offset(skip).limit(limit).all()
    return events

@app.post("/api/tickets/sync", response_model=schemas.TicketOut)
def sync_ticket(ticket: schemas.TicketSync, db: Session = Depends(get_db)):
    # Check if event exists
    db_event = db.query(models.Event).filter(models.Event.id == ticket.event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket.ticket_id).first()
    if db_ticket:
        raise HTTPException(status_code=400, detail="Ticket already synced")
        
    new_ticket = models.Ticket(
        id=ticket.ticket_id,
        event_id=ticket.event_id,
        owner_public_key=ticket.owner_public_key
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@app.post("/api/tickets/use", response_model=schemas.TicketOut)
def use_ticket(ticket_use: schemas.TicketUse, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_use.ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if db_ticket.state == models.TicketStateEnum.used:
        raise HTTPException(status_code=400, detail="Ticket already used")
        
    # Verify admin
    db_event = db.query(models.Event).filter(models.Event.id == db_ticket.event_id).first()
    if not db_event or db_event.admin_public_key != ticket_use.admin_public_key:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db_ticket.state = models.TicketStateEnum.used
    db_ticket.used_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.get("/api/tickets/{public_key}", response_model=list[schemas.TicketOut])
def get_user_tickets(public_key: str, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(models.Ticket.owner_public_key == public_key).all()
    return tickets

@app.get("/api/verify/{ticket_id}", response_model=schemas.TicketOut)
def verify_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket
