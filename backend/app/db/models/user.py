import sqlalchemy as sa
from sqlalchemy.orm import relationship
from ..base import Base

class User(Base):
    __tablename__ = "users"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    username = sa.Column(sa.String(length=100), nullable=False, unique=True)
    email = sa.Column(sa.String(length=100), nullable=False, unique=True)
    hashed_password = sa.Column(sa.String(length=255), nullable=False)

    # Relations
    watch_list = relationship("Watch", back_populates="user", cascade="all, delete-orphan")
    
