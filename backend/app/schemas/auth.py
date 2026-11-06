from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class DoctorLoginRequest(BaseModel):
    email: str = Field(..., description="Authorized physician email address")
    password: str = Field(..., min_length=6, description="Physician account password")


class DoctorProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    medical_license_number: str
    specialty: str
    institution: str
    role: str  # physician, qppv, admin
    is_active: bool = True


class DoctorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    doctor: DoctorProfile


class DoctorProvisionRequest(BaseModel):
    email: str = Field(..., description="Official institutional email")
    password: str = Field(..., min_length=8, description="Secure initial password")
    full_name: str = Field(..., min_length=3, description="Full professional doctor name")
    medical_license_number: str = Field(..., min_length=4, description="State/National Medical Council Registration Number")
    specialty: str = Field(..., description="Clinical medical specialty")
    institution: str = Field(..., description="Affiliated hospital, clinic, or medical college")
    role: str = Field(default="physician", description="Role: physician, qppv, or admin")


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    correlation_id: Optional[str] = None
    event_type: str
    actor: str
    actor_role: Optional[str] = None
    resource_id: Optional[str] = None
    action: Optional[str] = None
    ip_address: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
