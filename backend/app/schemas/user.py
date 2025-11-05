# shemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# Schéma de base
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr

# Pour la création
class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

# Pour le login (email OU username)
class UserLogin(BaseModel):
    login: str = Field(..., min_length=3)  # <- Peut être email OU username
    password: str = Field(..., min_length=6)

# Pour la réponse (affichage user)
class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True  # équivalent à orm_mode
