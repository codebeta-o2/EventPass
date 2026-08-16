from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import TicketStateEnum

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    max_tickets: int
    price_stroops: int
    admin_public_key: str

class EventOut(EventCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TicketSync(BaseModel):
    ticket_id: int
    event_id: int
    owner_public_key: str

class TicketUse(BaseModel):
    ticket_id: int
    admin_public_key: str

class TicketOut(BaseModel):
    id: int
    event_id: int
    owner_public_key: str
    state: TicketStateEnum
    created_at: datetime
    used_at: Optional[datetime]

    class Config:
        from_attributes = True
