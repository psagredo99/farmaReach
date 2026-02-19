from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    direccion = Column(String(500), default="")
    zona = Column(String(255), default="")
    codigo_postal = Column(String(32), default="")
    telefono = Column(String(64), default="")
    website = Column(String(500), default="")
    email = Column(String(255), default="")
    fuente = Column(String(64), nullable=False)
    estado_envio = Column(String(32), default="pendiente")
    notas = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, nullable=False)
    destinatario = Column(String(255), nullable=False)
    asunto = Column(String(255), nullable=False)
    cuerpo = Column(Text, nullable=False)
    estado = Column(String(32), nullable=False)
    detalle = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    nombre = Column(String(255), default="")
    created_at = Column(DateTime, server_default=func.now())
