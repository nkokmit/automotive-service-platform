"""Pydantic input schemas for all agent tools."""
from typing import Optional
from pydantic import BaseModel, Field


class SearchCarNewsInput(BaseModel):
    """Input for the search_car_news tool."""
    query: str = Field(..., description="Search query in Vietnamese or English")
    limit: int = Field(5, ge=1, le=20, description="Max number of results to return")
    collection: str = Field("car_news", description="Qdrant collection name")


class SearchUsedCarsInput(BaseModel):
    """Input for the search_used_cars tool."""
    brand: Optional[str] = Field(None, description="Car brand/make e.g. Toyota, Honda")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price in VND")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price in VND")
    year_from: Optional[int] = Field(None, ge=1990, description="Minimum manufacture year")
    year_to: Optional[int] = Field(None, le=2030, description="Maximum manufacture year")
    limit: int = Field(10, ge=1, le=50, description="Max number of results")


class CheckSlotsInput(BaseModel):
    """Input for the check_slots tool."""
    garage_id: str = Field(..., description="ID of the garage/service center")
    date: str = Field(..., description="Date in YYYY-MM-DD format")


class CreateBookingInput(BaseModel):
    """Input for the create_booking tool."""
    garage_id: str = Field(..., description="ID of the garage/service center")
    date: str = Field(..., description="Booking date in YYYY-MM-DD format")
    time_slot: str = Field(..., description="Time slot e.g. '09:00' or '14:30'")
    service_type: str = Field(..., description="Type of service e.g. 'oil_change', 'tire_rotation', 'full_inspection'")
    customer_name: str = Field(..., description="Full name of the customer")
    phone: str = Field(..., description="Customer phone number")
    notes: Optional[str] = Field(None, description="Optional notes for the mechanic")


class AnalyzeVehicleDamageInput(BaseModel):
    """Input for the analyze_vehicle_damage tool."""
    image_url: Optional[str] = Field(None, description="Public URL of the vehicle image")
    image_base64: Optional[str] = Field(None, description="Base64-encoded image data")
