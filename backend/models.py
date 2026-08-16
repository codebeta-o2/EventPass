import enum
from sqlalchemy import Column, Integer, String, BigInteger, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base

class TicketStateEnum(str, enum.Enum):
    valid = "valid"
    used = "used"

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    max_tickets = Column(Integer)
    price_stroops = Column(BigInteger)
    admin_public_key = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Ticket(Base):
    __tablename__ = "tickets"

    # We map this ID to the Soroban smart contract ticket ID
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    owner_public_key = Column(String, index=True)
    state = Column(Enum(TicketStateEnum), default=TicketStateEnum.valid)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
