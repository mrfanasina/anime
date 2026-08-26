"""
Schémas Pydantic pour les utilisateurs.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserBase(BaseModel):
    """Schéma de base pour un utilisateur."""
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    """Schéma de création d'un utilisateur."""
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Schéma de connexion (email OU username)."""
    login: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    """Schéma de réponse pour les données utilisateur."""
    id: int

    class Config:
        from_attributes = True
