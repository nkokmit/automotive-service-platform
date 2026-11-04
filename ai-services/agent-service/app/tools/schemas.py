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
    license_plate: Optional[str] = Field(None, description="Optional vehicle license plate e.g. '51H-123.45'")
    notes: Optional[str] = Field(None, description="Optional notes for the mechanic")


class AnalyzeVehicleDamageInput(BaseModel):
    """Input for the analyze_vehicle_damage tool."""
    image_url: Optional[str] = Field(
        None,
        description="Public HTTP/HTTPS URL of the vehicle image. Leave None if the user already attached an image.",
    )
    image_base64: Optional[str] = Field(
        None,
        description="Base64-encoded image data. Leave None if the user already attached an image.",
    )
    vehicle_brand: Optional[str] = Field(
        None,
        description="Car brand/model mentioned by the user (e.g. 'Kia Morning', 'Toyota Vios', 'Mazda CX-5', 'Mercedes C200')",
    )
    vehicle_segment: Optional[str] = Field(
        None,
        description="Optional vehicle segment: economy | standard | suv_mpv | luxury",
    )


class LookupVehicleHistoryInput(BaseModel):
    """Input for the lookup_vehicle_and_service_history tool (customer-vehicle-service)."""
    license_plate: Optional[str] = Field(
        None,
        description="Vehicle license plate e.g. '51H-123.45' or '30H-111.22'",
    )
    customer_phone: Optional[str] = Field(
        None,
        description="Customer phone number e.g. '0901234567'",
    )
    customer_name: Optional[str] = Field(
        None,
        description="Customer full name e.g. 'Nguyễn Văn An'",
    )
    keyword: Optional[str] = Field(
        None,
        description="General search keyword (brand, model, VIN, or plate)",
    )


class RecordVehicleServiceHistoryInput(BaseModel):
    """Input for the record_vehicle_service_history tool (customer-vehicle-service)."""
    license_plate: str = Field(..., description="Vehicle license plate e.g. '51H-123.45'")
    make: Optional[str] = Field(None, description="Vehicle make/brand e.g. 'Toyota'")
    model: Optional[str] = Field(None, description="Vehicle model e.g. 'Vios'")
    model_year: Optional[int] = Field(None, description="Vehicle manufacture year e.g. 2022")
    odometer_km: Optional[int] = Field(None, ge=0, description="Current odometer reading in km e.g. 46000")
    summary: str = Field(..., description="Short summary of maintenance/repair performed e.g. 'Bảo dưỡng định kỳ 45.000 km'")
    description: Optional[str] = Field(None, description="Detailed description of parts/work performed")
    garage_name: Optional[str] = Field(None, description="Garage name where service was performed")
    customer_name: Optional[str] = Field(None, description="Customer name who brought the vehicle")
    customer_phone: Optional[str] = Field(None, description="Customer phone number")
