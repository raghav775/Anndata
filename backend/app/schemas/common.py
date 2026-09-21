from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Paginated(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


class Timestamped(ORMModel):
    created_at: datetime
    updated_at: datetime
